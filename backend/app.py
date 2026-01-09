from flask import Flask, jsonify, request, redirect, url_for, session as flask_session
from models import db, Group, Player, Session, Balance, User, Settlement
from datetime import datetime, timedelta
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS
import os
from dotenv import load_dotenv
import re
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# PostgreSQL URL handling
database_url = os.environ.get('DATABASE_URL', 'sqlite:///pokercount.db')
# Some platforms provide PostgreSQL URLs starting with postgres://, but SQLAlchemy needs postgresql://
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

# Configuration
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'generate-a-good-secret-key'),
    SQLALCHEMY_DATABASE_URI=database_url,
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    
    # --- UPDATED COOKIE SETTINGS ---
    # 1. Allow cookies over HTTPS (Production) but keep False for HTTP (Localhost)
    SESSION_COOKIE_SECURE=os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true',
    
    # 2. Allow cookies to travel between Vercel and Render
    # 'None' is required for cross-site (Production). 'Lax' is better for Localhost.
    SESSION_COOKIE_SAMESITE=os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax'),
    
    SESSION_COOKIE_HTTPONLY=True,
    PERMANENT_SESSION_LIFETIME=timedelta(days=365)
)

# Initialize extensions
db.init_app(app)
# Enable CSRF in production
#if os.environ.get('FLASK_ENV') == 'production':
#    csrf = CSRFProtect(app)

with app.app_context():
    db.create_all()

# Configure CORS
cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
CORS(app, origins=cors_origins, supports_credentials=True)

# Setup logging
def configure_logging():
    log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
    numeric_level = getattr(logging, log_level, logging.INFO)
    
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/pokercount.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(numeric_level)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(numeric_level)
        app.logger.info('Pokercount startup')
    else:
        app.logger.setLevel(logging.ERROR)

configure_logging()

# Helper functions
def calculate_settlements_for_group(group_id):
    """Calculate settlements for all players in a group"""
    group = Group.query.get(group_id)
    if not group:
        return
        
    # Calculate raw balances for ALL players who have participated in sessions
    raw_balances = {}
    
    # First, get all players who have balances in any session
    for session in group.sessions:
        for balance in session.balances:
            player_id = balance.player_id
            if player_id not in raw_balances:
                raw_balances[player_id] = 0
            raw_balances[player_id] += balance.amount
    
    # If there are no balances, nothing to do
    if not raw_balances:
        return
    
    # Adjust for existing settled settlements
    adjusted_balances = raw_balances.copy()
    settled_settlements = Settlement.query.filter(
        Settlement.group_id == group_id,
        Settlement.settled == True
    ).all()
    
    for settlement in settled_settlements:
        adjusted_balances[settlement.from_player_id] += settlement.amount
        adjusted_balances[settlement.to_player_id] -= settlement.amount
    
    # Delete all unsettled settlements for this group
    unsettled = Settlement.query.filter(
        Settlement.group_id == group_id,
        Settlement.settled == False
    ).all()
    
    for settlement in unsettled:
        db.session.delete(settlement)
    
    # Create new settlements using the simplified debt resolution algorithm
    creditors = [(pid, bal) for pid, bal in adjusted_balances.items() if bal > 0]
    debtors = [(pid, abs(bal)) for pid, bal in adjusted_balances.items() if bal < 0]
    
    # Sort by amount (largest first)
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)
    
    # Match debtors with creditors
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debtor_amount = debtors[i]
        creditor_id, creditor_amount = creditors[j]
        
        if debtor_amount <= 0 or creditor_amount <= 0:
            break
            
        payment = min(debtor_amount, creditor_amount)
        if payment > 0:
            debtor_player = Player.query.get(debtor_id)
            creditor_player = Player.query.get(creditor_id)
            
            settlement = Settlement(
                from_player_id=debtor_id,
                to_player_id=creditor_id,
                amount=payment,
                description=f"{debtor_player.name} pays {creditor_player.name}",
                group_id=group_id
            )
            db.session.add(settlement)
            
            # Update remaining amounts
            debtors[i] = (debtor_id, debtor_amount - payment)
            creditors[j] = (creditor_id, creditor_amount - payment)
        
        # Move to next player if their balance is settled
        if debtors[i][1] <= 0.01:  # Use small threshold to handle floating point errors
            i += 1
        if creditors[j][1] <= 0.01:
            j += 1
    
    db.session.commit()



def is_password_valid(password):
    """
    Password must be at least 8 characters long and contain:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[ !@#$%&'()*+,-./[\\\]^_`{|}~"+r'"]', password):
        return False
    return True

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in flask_session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Request handlers
#@app.before_request
#def before_request():
    # Force HTTPS in production
 #   if not request.is_secure and not app.debug:
 #       url = request.url.replace('http://', 'https://', 1)
  #      return redirect(url)

@app.after_request
def after_request(response):
    if not app.debug:
        app.logger.info(f'{request.remote_addr} {request.method} {request.url} {response.status}')
    return response

# Authentication routes
@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username')
        password = data.get('password')
        remember_me = data.get('remember_me', False)
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            flask_session.permanent = remember_me
            flask_session.clear()
            flask_session['user_id'] = user.id
            flask_session['username'] = username
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': username
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': "Invalid username or password"
            }), 401
            
    return jsonify({'message': 'Please send a POST request to login'})

@app.route('/auth/status')
def auth_status():
    if 'user_id' in flask_session:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': flask_session.get('user_id'),
                'username': flask_session.get('username')
            }
        })
    else:
        return jsonify({
            'authenticated': False
        })

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username')
        password = data.get('password')
        
        # Validate password
        if not is_password_valid(password):
            return jsonify({
                'success': False,
                'error': "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character"
            }), 400
        
        # Validate username
        if not re.match("^[a-zA-Z0-9_-]{3,32}$", username):
            return jsonify({
                'success': False,
                'error': "Username must be 3-32 characters long and contain only letters, numbers, underscore, and hyphen"
            }), 400
        
        # Check if user exists
        if User.query.filter_by(username=username).first():
            return jsonify({
                'success': False,
                'error': "Username already exists"
            }), 400
        
        # Create new user
        user = User(username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': username
            }
        })
        
    return jsonify({'message': 'Please send a POST request to register'})

@app.route('/logout')
def logout():
    flask_session.clear()
    return jsonify({'success': True})

# Group management routes
@app.route('/groups/all')
@login_required
def get_all_groups():
    # Get all groups
    all_groups = Group.query.all()
    
    # For each group, count the number of players
    groups_data = []
    for group in all_groups:
        player_count = Player.query.filter_by(group_id=group.id).count()
        groups_data.append({
            'id': group.id,
            'name': group.name,
            'creator_id': group.creator_id,
            'player_count': player_count
        })
    
    return jsonify({
        'success': True,
        'groups': groups_data
    })


@app.route('/home')
@login_required
def home():
    # Get groups where the logged-in user has joined players
    joined_groups = Group.query.join(
        Player,
        Player.group_id == Group.id
    ).filter(
        Player.user_id == flask_session['user_id'],
        Player.joined == True
    ).distinct().all()
    
    empty_groups = Group.query.filter(~Group.players.any()).all()
    all_groups = list(set(joined_groups + empty_groups))

    return jsonify({
        'groups': [
            {
                'id': group.id,
                'name': group.name,
                'creator_id': group.creator_id
            } for group in all_groups
        ],
        'user': {
            'id': flask_session.get('user_id'),
            'username': flask_session.get('username')
        }
    })

@app.route('/create_group', methods=['POST'])
@login_required
def create_group():
    data = request.get_json() if request.is_json else request.form
    group_name = data.get('group_name')

    if Group.query.filter_by(name=group_name).first():
        return jsonify({
            'success': False,
            'error': "Group name already exists"
        }), 400
    
    new_group = Group(name=group_name, creator_id=flask_session['user_id'])
    db.session.add(new_group)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'group': {
            'id': new_group.id,
            'name': new_group.name,
            'creator_id': new_group.creator_id
        }
    })

@app.route('/setup_group/<group_name>', methods=['GET', 'POST'])
@login_required
def setup_group(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        player_name = data.get('player_name')
        if player_name:
            new_player = Player(name=player_name, group=group)
            db.session.add(new_player)
            db.session.commit()
            return jsonify({
                'success': True,
                'player': {
                    'id': new_player.id,
                    'name': new_player.name,
                    'group_id': new_player.group_id
                }
            })
    
    return jsonify({
        'group': {
            'id': group.id,
            'name': group.name,
            'creator_id': group.creator_id,
            'players': [
                {
                    'id': player.id,
                    'name': player.name,
                    'joined': player.joined
                } for player in group.players
            ]
        }
    })

@app.route('/find_group', methods=['GET', 'POST'])
@login_required
def find_group():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        group_name = data.get('group_name')
        group = Group.query.filter_by(name=group_name).first()
        
        if not group:
            return jsonify({
                'success': False,
                'error': "Group not found"
            }), 404
            
        return jsonify({
            'success': True,
            'group': {
                'id': group.id,
                'name': group.name
            }
        })
    
    return jsonify({'message': 'Please send a POST request with a group name'})

@app.route('/join_group/<group_name>', methods=['GET', 'POST'])
@login_required
def join_group(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()

    code = request.args.get('code')
    if code and str(group.id) != code:
        return jsonify({
            'success': False,
            'error': "Invalid invitation code"
        }), 403
    
    # Check if user already has a player in this group
    existing_player = Player.query.filter_by(
        user_id=flask_session['user_id'],
        group_id=group.id,
        joined=True
    ).first()
    
    if existing_player:
        return jsonify({
            'success': True,
            'message': 'Already joined this group',
            'redirect': f'/group/{group_name}/dashboard'
        })
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        player_id = data.get('selected_player')
        player = Player.query.get(player_id)
        
        if not player:
            return jsonify({
                'success': False,
                'error': 'Player not found'
            }), 404
            
        player.joined = True
        player.user_id = flask_session['user_id']
        db.session.commit()
        
        return jsonify({
            'success': True,
            'player': {
                'id': player.id,
                'name': player.name,
                'group_id': player.group_id
            }
        })
    
    return jsonify({
        'players': [
            {
                'id': player.id,
                'name': player.name,
                'joined': player.joined
            } for player in group.players if not player.joined
        ]
    })

@app.route('/group/<group_name>/dashboard')
@login_required
def group_dashboard(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    
    # Find the current user's player in this group
    current_user_player = Player.query.filter_by(
        user_id=flask_session['user_id'],
        group_id=group.id,
        joined=True
    ).first()
    
    if not current_user_player:
        return jsonify({
            'success': False,
            'error': 'You need to join this group first',
            'redirect': f'/join-group/{group_name}'
        }), 400
    
    return jsonify({
        'group': {
            'id': group.id,
            'name': group.name,
            'creator_id': group.creator_id,
            'players': [
                {
                    'id': player.id,
                    'name': player.name,
                    'joined': player.joined,
                    'user_id': player.user_id
                } for player in group.players
            ],
        'sessions': [
            {
                'id': session.id,
                'name': session.name,
                'date': session.date.strftime('%Y-%m-%d'),
                'buy_in': session.buy_in,
                'balances': [
                    {
                        'id': balance.id,
                        'amount': balance.amount,
                        'session_id': balance.session_id,
                        'player_id': balance.player_id
                    } for balance in session.balances  # Assuming you have a relationship set up
                ]
            } for session in group.sessions
        ]
        },
        'current_user': {
            'id': current_user_player.id,
            'name': current_user_player.name
        } 
    })

# Session management routes
@app.route('/add_session/<group_name>', methods=['GET', 'POST'])
@login_required
def add_session(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        
        try:
            poker_session = Session(
                name=data.get('session_name'),
                date=datetime.strptime(data.get('date'), '%Y-%m-%d'),
                buy_in=float(data.get('buy_in', 0)),
                group=group
            )
            db.session.add(poker_session)
            db.session.commit()  
            
            for player in group.players:
                balance_key = f'balance_{player.name}'
                
                if balance_key in data:
                    # Only create balance records for players who participated
                    amount = float(data.get(balance_key, 0))
                    balance = Balance(
                        amount=amount - poker_session.buy_in,
                        session_id=poker_session.id,
                        player_id=player.id
                    )
                    db.session.add(balance)
            
            db.session.commit()

            calculate_settlements_for_group(group.id)
            
            return jsonify({
                'success': True,
                'session': {
                    'id': poker_session.id,
                    'name': poker_session.name,
                    'date': poker_session.date.strftime('%Y-%m-%d'),
                    'buy_in': poker_session.buy_in
                }
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
    
    return jsonify({
        'group': {
            'id': group.id,
            'name': group.name,
            'players': [
                {
                    'id': player.id,
                    'name': player.name
                } for player in group.players
            ]
        }
    })


@app.route('/group/<group_name>/session/<int:session_id>')
@login_required
def view_session(group_name, session_id):
    poker_session = Session.query.get_or_404(session_id)
    
    return jsonify({
        'session': {
            'id': poker_session.id,
            'name': poker_session.name,
            'date': poker_session.date.strftime('%Y-%m-%d'),
            'buy_in': poker_session.buy_in,
            'balances': [
                {
                    'id': balance.id,
                    'amount': balance.amount,
                    'player': {
                        'id': balance.player.id,
                        'name': balance.player.name
                    }
                } for balance in poker_session.balances
            ]
        }
    })

@app.route('/update_session/<group_name>/<int:session_id>', methods=['POST'])
@login_required
def update_session(group_name, session_id):
    group = Group.query.filter_by(name=group_name).first_or_404()
    session = Session.query.get_or_404(session_id)
    
    # Check if session belongs to the group
    if session.group_id != group.id:
        return jsonify({
            'success': False,
            'error': 'Session does not belong to this group'
        }), 400
    
    data = request.get_json() if request.is_json else request.form
    
    try:
        # Update session details
        session.name = data.get('session_name', session.name)
        session.date = datetime.strptime(data.get('date'), '%Y-%m-%d')
        session.buy_in = float(data.get('buy_in', session.buy_in))
        
        # Update balances
        for player in group.players:
            balance_key = f'balance_{player.name}'
            
            if balance_key in data:
                # Get the existing balance or create a new one
                balance = Balance.query.filter_by(
                    session_id=session.id,
                    player_id=player.id
                ).first()
                
                if balance:
                    # Calculate the new balance (cash-out minus buy-in)
                    cash_out = float(data.get(balance_key, 0))
                    balance.amount = cash_out - session.buy_in
                else:
                    # Create a new balance if player was added
                    cash_out = float(data.get(balance_key, 0))
                    balance = Balance(
                        amount=cash_out - session.buy_in,
                        session_id=session.id,
                        player_id=player.id
                    )
                    db.session.add(balance)
        
        db.session.commit()

        calculate_settlements_for_group(group.id)
        
        return jsonify({
            'success': True,
            'session': {
                'id': session.id,
                'name': session.name,
                'date': session.date.strftime('%Y-%m-%d'),
                'buy_in': session.buy_in
            }
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating session: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/settlements/<group_name>')
@login_required
def show_settlements(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    
    # Get the logged-in user's player record for this group
    current_player = Player.query.filter_by(
        user_id=flask_session['user_id'],
        group_id=group.id,
        joined=True
    ).first()
    
    if not current_player:
        return jsonify({
            'success': False,
            'error': 'You need to join this group first'
        }), 400
    
    # Calculate raw balance for display
    raw_balance = sum(balance.amount for session in group.sessions
                     for balance in session.balances if balance.player_id == current_player.id)
    
    # Check if we need to calculate settlements (if none exist for this group)
    existing_settlements = Settlement.query.filter(
        Settlement.group_id == group.id
    ).first()
    
    if not existing_settlements:
        # Calculate settlements for all players
        calculate_settlements_for_group(group.id)
    
    # Get all settlements for the current player
    current_player_settlements = Settlement.query.filter(
        ((Settlement.from_player_id == current_player.id) | 
        (Settlement.to_player_id == current_player.id)),
        Settlement.group_id == group.id
    ).all()
    
    # Format settlements for the response
    formatted_settlements = []
    for settlement in current_player_settlements:
        from_player = Player.query.get(settlement.from_player_id)
        to_player = Player.query.get(settlement.to_player_id)
        
        text = f"{from_player.name} pays {to_player.name} €{settlement.amount:.2f}"
        if settlement.settled:
            text += " (Settled)"
            
        formatted_settlements.append({
            'id': str(settlement.id),
            'text': text,
            'from': from_player.name,
            'to': to_player.name,
            'amount': settlement.amount,
            'settled': settlement.settled,
            'settled_date': settlement.settled_date.isoformat() if settlement.settled_date else None
        })
    
    return jsonify({
        'settlements': formatted_settlements,
        'current_user': {
            'id': current_player.id,
            'name': current_player.name,
            'username': flask_session.get('username'),
            'balance': raw_balance
        }
    })

@app.route('/settlements/<group_name>/settle', methods=['POST'])
@login_required
def mark_settlement_as_settled(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    
    # Get the logged-in user's player record for this group
    current_player = Player.query.filter_by(
        user_id=flask_session['user_id'],
        group_id=group.id,
        joined=True
    ).first()
    
    if not current_player:
        return jsonify({
            'success': False,
            'error': 'You need to join this group first'
        }), 400
    
    # Get the settlement ID from the request
    data = request.get_json() if request.is_json else request.form
    settlement_id = data.get('settlementId')
    
    if not settlement_id:
        return jsonify({
            'success': False,
            'error': 'Settlement ID is required'
        }), 400
    
    # Find the settlement
    settlement = Settlement.query.get(settlement_id)
    
    if not settlement:
        return jsonify({
            'success': False,
            'error': 'Settlement not found'
        }), 404
    
    # Verify the settlement belongs to the current user
    if settlement.from_player_id != current_player.id:
        return jsonify({
            'success': False,
            'error': 'You can only mark your own settlements as settled'
        }), 403
    
    # Mark the settlement as settled
    try:
        settlement.settled = True
        settlement.settled_date = datetime.now()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Settlement marked as completed',
            'settlement': {
                'id': settlement.id,
                'settled': settlement.settled,
                'settled_date': settlement.settled_date.isoformat()
            }
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error marking settlement as settled: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to mark settlement as settled'
        }), 500
    
@app.route('/player/<int:player_id>/stats')
@login_required
def player_stats(player_id):
    player = Player.query.get_or_404(player_id)
    group = Group.query.get_or_404(player.group_id)
    
    # Check if the current user has access to this group
    current_user_player = Player.query.filter_by(
        user_id=flask_session['user_id'],
        group_id=group.id,
        joined=True
    ).first()
    
    if not current_user_player:
        return jsonify({
            'success': False,
            'error': 'You need to join this group to view player statistics'
        }), 403
    
    # Get all sessions for this group
    sessions = Session.query.filter_by(group_id=group.id).order_by(Session.date.desc()).all()
    
    # Calculate player statistics
    player_balances = []
    total_winnings = 0
    sessions_played = 0
    winning_sessions = 0
    biggest_win = 0
    biggest_loss = 0
    
    for session in sessions:
        # Find this player's balance in the session
        balance = next((b for b in session.balances if b.player_id == player_id), None)
        
        if balance:
            sessions_played += 1
            total_winnings += balance.amount
            
            if balance.amount > 0:
                winning_sessions += 1
                biggest_win = max(biggest_win, balance.amount)
            elif balance.amount < 0:
                biggest_loss = min(biggest_loss, balance.amount)
    
    # Calculate win rate and average
    win_rate = round((winning_sessions / sessions_played) * 100) if sessions_played > 0 else 0
    average_winnings = total_winnings / sessions_played if sessions_played > 0 else 0
    
    # Format the response
    return jsonify({
        'player': {
            'id': player.id,
            'name': player.name,
            'group_id': player.group_id
        },
        'group': {
            'id': group.id,
            'name': group.name
        },
        'sessions': [
            {
                'id': session.id,
                'name': session.name,
                'date': session.date.strftime('%Y-%m-%d'),
                'buy_in': session.buy_in,
                'balances': [
                    {
                        'id': balance.id,
                        'amount': balance.amount,
                        'player_id': balance.player_id,
                        'session_id': balance.session_id
                    } for balance in session.balances
                ]
            } for session in sessions
        ],
        'stats': {
            'totalWinnings': total_winnings,
            'sessionsPlayed': sessions_played,
            'winRate': win_rate,
            'biggestWin': biggest_win,
            'biggestLoss': biggest_loss,
            'averageWinnings': average_winnings
        }
    })



# Player management routes
@app.route('/add_player/<group_name>', methods=['POST'])
@login_required
def add_player(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    data = request.get_json() if request.is_json else request.form
    player_name = data.get('player_name')
    
    if not player_name:
        return jsonify({
            'success': False,
            'error': 'Player name is required'
        }), 400
        
    new_player = Player(name=player_name, group=group)
    db.session.add(new_player)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'player': {
            'id': new_player.id,
            'name': new_player.name,
            'group_id': new_player.group_id
        }
    })

@app.route('/remove_player/<group_name>/<int:player_id>', methods=['POST'])
@login_required
def remove_player(group_name, player_id):
    player = Player.query.get_or_404(player_id)
    db.session.delete(player)
    db.session.commit()
    
    return jsonify({
        'success': True
    })

@app.route('/remove_group/<group_name>', methods=['POST'])
@login_required
def remove_group(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    db.session.delete(group)
    db.session.commit()
    
    return jsonify({
        'success': True
    })

@app.route('/leave_group/<group_name>', methods=['POST'])
@login_required
def leave_group(group_name):
    group = Group.query.filter_by(name=group_name).first_or_404()
    
    # Find the player record for the current user in this group
    player = Player.query.filter_by(
        user_id=flask_session['user_id'],
        group_id=group.id,
        joined=True
    ).first()
    
    if not player:
        return jsonify({
            'success': False,
            'error': 'You are not a member of this group'
        }), 400
    
    # If the user is the creator and there are other joined players, don't allow leaving
    if group.creator_id == flask_session['user_id']:
        joined_players = Player.query.filter_by(
            group_id=group.id,
            joined=True
        ).count()
        
        if joined_players > 1:
            return jsonify({
                'success': False,
                'error': 'As the group creator, you cannot leave while other players are in the group'
            }), 400
    
    # Update the player record to mark as not joined
    player.joined = False
    player.user_id = None
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'You have left the group successfully'
    })


@app.route('/remove_session/<group_name>/<int:session_id>', methods=['POST'])
@login_required
def remove_session(group_name, session_id):
    poker_session = Session.query.get_or_404(session_id)
    group_id = poker_session.group_id
    balances = Balance.query.filter_by(session_id=session_id).all()
    for balance in balances:
        db.session.delete(balance)
    db.session.delete(poker_session)
    db.session.commit()
    
    calculate_settlements_for_group(group_id)

    return jsonify({
        'success': True
    })

def reset_db():
    with app.app_context():
        db.drop_all()
        db.create_all()

# Application entry point
if __name__ == '__main__':      
    app.run(debug=os.environ.get('FLASK_ENV') == 'development', 
            host='0.0.0.0', 
            port=int(os.environ.get('PORT', 5000)))