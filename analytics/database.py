"""
Database Connection and Query Access Layer for Python Analytics.
Supports MySQL 8 via environment variables, with SQLite fallback.
"""

import os
import sqlite3
from typing import Optional, List, Dict, Any

try:
    import mysql.connector
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False


def get_db_connection():
    """
    Returns a database connection based on environment configuration.
    Defaults to MySQL if DB_HOST is configured, otherwise SQLite.
    """
    db_host = os.getenv("DB_HOST")
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "elearning_analytics")
    db_port = int(os.getenv("DB_PORT", 3306))

    if db_host and MYSQL_AVAILABLE:
        return mysql.connector.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            database=db_name,
            port=db_port
        )
    
    # Fallback to local SQLite file if MySQL is not reachable or not configured
    sqlite_path = os.getenv("SQLITE_PATH", os.path.join(os.path.dirname(__file__), "..", "database.sqlite"))
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    return conn


def execute_query(query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """
    Safely executes a parameterized query and returns rows as dictionaries.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
            
        columns = [col[0] for col in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        
        result = []
        for row in rows:
            if isinstance(row, dict):
                result.append(row)
            elif hasattr(row, 'keys'):
                result.append({k: row[k] for k in row.keys()})
            else:
                result.append(dict(zip(columns, row)))
        return result
    finally:
        conn.close()
