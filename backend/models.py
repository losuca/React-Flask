from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    players = db.relationship('Player', backref='group', lazy=True, 
                            foreign_keys='Player.group_id')
    sessions = db.relationship('Session', backref='group', lazy=True)
    settlements = db.relationship('Settlement', backref='group', lazy=True)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id', use_alter=True, name='fk_player_group'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))  # Link to the user who controls this player
    joined = db.Column(db.Boolean, default=False)
    balances = db.relationship('Balance', backref='player', lazy=True)
    # Add relationships for settlements
    outgoing_settlements = db.relationship('Settlement', backref='from_player', lazy=True, foreign_keys='Settlement.from_player_id')
    incoming_settlements = db.relationship('Settlement', backref='to_player', lazy=True, foreign_keys='Settlement.to_player_id')


class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    buy_in = db.Column(db.Float, nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'))
    balances = db.relationship('Balance', backref='session', lazy=True)

class Balance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'))
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'))

class Settlement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    from_player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    to_player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    settled = db.Column(db.Boolean, default=False)
    settled_date = db.Column(db.DateTime, nullable=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)
