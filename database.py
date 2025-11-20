import sqlite3
import os

DB_NAME = "portfolio.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with the portfolio table."""
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Database initialized.")

def add_stock(symbol, name):
    """Add a stock to the portfolio."""
    try:
        conn = get_db_connection()
        conn.execute('INSERT INTO portfolio (symbol, name) VALUES (?, ?)', (symbol, name))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False  # Already exists

def remove_stock(symbol):
    """Remove a stock from the portfolio."""
    conn = get_db_connection()
    conn.execute('DELETE FROM portfolio WHERE symbol = ?', (symbol,))
    conn.commit()
    conn.close()

def get_portfolio():
    """Get all stocks in the portfolio."""
    conn = get_db_connection()
    portfolio = conn.execute('SELECT * FROM portfolio ORDER BY added_at DESC').fetchall()
    conn.close()
    return [dict(row) for row in portfolio]
