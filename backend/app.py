from flask import Flask, jsonify, request, redirect, url_for, session as flask_session
from models import db, Group, Player, Session, Balance, User, Settlement
from datetime import datetime, timedelta
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS
import os
import re
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps

app = Flask(__name__)

# Configuration
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'generate-a-good-secret-key'),
    SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///pokercount.db'),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SESSION_COOKIE_SECURE=False,  # Set to True in production
    SESSION_COOKIE_HTTPONLY=True,
    PERMANENT_SESSION_LIFETIME=timedelta(hours=2)
)

# Initialize extensions
db.init_app(app)
# csrf = CSRFProtect(app)
CORS(app, supports_credentials=True)  # Add CORS support
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Setup logging
def configure_logging():
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/pokercount.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Pokercount startup')
    else:
        app.logger.setLevel(logging.ERROR)

configure_logging()

# Helper functions
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
@app.before_request
def before_request():
    # Force HTTPS in production
    if not request.is_secure and not app.debug:
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url)

@app.after_request
def after_request(response):
    if not app.debug:
        app.logger.info(f'{request.remote_addr} {request.method} {request.url} {response.status}')
    return response

# Authentication routes
@app.route('/', methods=['GET', 'POST'])
@limiter.limit("5 per minute", methods=["POST"])
def login():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username')
        password = data.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            flask_session.permanent = False
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

@app.route('/register', methods=['GET', 'POST'])
@limiter.limit("20 per hour")
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
        
        flask_session['user_id'] = user.id
        flask_session['username'] = username
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
        group.current_user_id = player.id
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
    if not group.current_user_id:
        return jsonify({
            'success': False,
            'error': 'You need to join this group first',
            'redirect': f'/join-group/{group_name}'
        }), 400
    
    current_user = Player.query.get(group.current_user_id)
    
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
            'id': current_user.id,
            'name': current_user.name
        } if current_user else None
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
                amount = float(data.get(f'balance_{player.name}', 0))
                balance = Balance(
                    amount=amount - poker_session.buy_in,
                    session_id=poker_session.id,
                    player_id=player.id
                )
                db.session.add(balance)
            
            db.session.commit()
            
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
    
    # Calculate total balances for all players from all sessions
    raw_balances = {}
    for player in group.players:
        total = sum(balance.amount for session in group.sessions
                   for balance in session.balances if balance.player_id == player.id)
        raw_balances[player.id] = total
    
    # Get all existing settlements for this group
    all_group_settlements = Settlement.query.filter(
        Settlement.group_id == group.id,
        Settlement.settled == True  # Only consider settled settlements
    ).all()
    
    # Create adjusted balances by accounting for settled amounts
    adjusted_balances = raw_balances.copy()
    
    # Adjust balances based on settled settlements
    for settlement in all_group_settlements:
        # When someone has paid money, their balance increases
        adjusted_balances[settlement.from_player_id] += settlement.amount
        # When someone has received money, their balance decreases
        adjusted_balances[settlement.to_player_id] -= settlement.amount
    
    # Delete any unsettled settlements for the current player - we'll recalculate these
    unsettled = Settlement.query.filter(
        ((Settlement.from_player_id == current_player.id) | 
        (Settlement.to_player_id == current_player.id)),
        Settlement.group_id == group.id,
        Settlement.settled == False
    ).all()
    
    for settlement in unsettled:
        db.session.delete(settlement)
    
    db.session.commit()
    
    # Create new settlements based on adjusted balances
    if adjusted_balances[current_player.id] > 0:  # Current player is owed money
        for player in group.players:
            if player.id != current_player.id and adjusted_balances[player.id] < 0:
                # Calculate how much this player owes the current player
                owed_amount = min(adjusted_balances[current_player.id], abs(adjusted_balances[player.id]))
                
                if owed_amount > 0:
                    settlement = Settlement(
                        from_player_id=player.id,
                        to_player_id=current_player.id,
                        amount=owed_amount,
                        description=f"{player.name} pays {current_player.name}",
                        group_id=group.id
                    )
                    db.session.add(settlement)
    elif adjusted_balances[current_player.id] < 0:  # Current player owes money
        for player in group.players:
            if player.id != current_player.id and adjusted_balances[player.id] > 0:
                # Calculate how much the current player owes this player
                owed_amount = min(abs(adjusted_balances[current_player.id]), adjusted_balances[player.id])
                
                if owed_amount > 0:
                    settlement = Settlement(
                        from_player_id=current_player.id,
                        to_player_id=player.id,
                        amount=owed_amount,
                        description=f"{current_player.name} pays {player.name}",
                        group_id=group.id
                    )
                    db.session.add(settlement)
    
    db.session.commit()
    
    # Get all settlements for the current player (both new and previously settled)
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
        
        text = f"{from_player.name} pays {to_player.name} ${settlement.amount:.2f}"
        if settlement.settled:
            text += " (Settled)"
            
        formatted_settlements.append({
            'id': str(settlement.id),  # Convert to string to match frontend expectation
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
            'balance': raw_balances[current_player.id]  # Return the raw balance for display
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

@app.route('/remove_session/<group_name>/<int:session_id>', methods=['POST'])
@login_required
def remove_session(group_name, session_id):
    poker_session = Session.query.get_or_404(session_id)
    balances = Balance.query.filter_by(session_id=session_id).all()
    for balance in balances:
        db.session.delete(balance)
    db.session.delete(poker_session)
    db.session.commit()
    
    return jsonify({
        'success': True
    })

# Database management
def reset_db():
    with app.app_context():
        db.drop_all()
        db.create_all()

# Application entry point
if __name__ == '__main__':
    reset_db()
    #with app.app_context():
    #    db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)