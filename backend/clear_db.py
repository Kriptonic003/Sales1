import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "sales_analytics.db")

def clear_comments():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Disable foreign keys temporarily if needed, though we delete both
        cursor.execute("DELETE FROM sentiment_scores;")
        cursor.execute("DELETE FROM social_posts;")
        
        conn.commit()
        count = cursor.rowcount
        conn.close()
        
        print("✅ Database cleared successfully!")
        print("- All comments removed.")
        print("- All sentiment scores removed.")
    except Exception as e:
        print(f"❌ Error clearing database: {e}")

if __name__ == "__main__":
    clear_comments()
