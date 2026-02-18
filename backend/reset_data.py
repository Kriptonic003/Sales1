from database import SessionLocal
import models

def output(msg):
    print(f"[RESET] {msg}")

def reset_product_data(product_name, brand_name):
    db = SessionLocal()
    try:
        # 1. Delete Social Posts
        deleted_posts = (
            db.query(models.SocialPost)
            .filter(
                models.SocialPost.product_name == product_name,
                models.SocialPost.brand_name == brand_name
            )
            .delete(synchronize_session=False)
        )
        
        # 2. Delete Predictions
        deleted_preds = (
            db.query(models.Prediction)
            .filter(
                models.Prediction.product_name == product_name,
                models.Prediction.brand_name == brand_name
            )
            .delete(synchronize_session=False)
        )
        
        # 3. Delete Sales Data (Optional - usually we keep this, but if it was mock...)
        # Let's keep sales data for now as it might be useful
        
        db.commit()
        output(f"Cleared {deleted_posts} posts and {deleted_preds} predictions for {brand_name} {product_name}")
        
    except Exception as e:
        output(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Clear NeoGadget (Default)
    reset_product_data("NeoGadget", "BlueNova")
    
    # Clear "sunscreen" (User's test)
    reset_product_data("sunscreen", "mamaearth")
