from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()

gerant = User(
    name="Ibrahima bah",
    phone="+33749404145",  
)
db.add(gerant)
db.commit()
print(f"✅ Gérant créé : {gerant.name} / {gerant.phone} / id={gerant.id}")
db.close()
exit()