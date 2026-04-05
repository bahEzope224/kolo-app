import boto3
import uuid
import traceback
from botocore.config import Config
from ..config import settings

def get_r2_client():
    if not all([settings.r2_account_id, settings.r2_access_key_id, settings.r2_secret_access_key]):
        return None
    
    return boto3.client(
        service_name="s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",  # R2 utilise 'auto'
        config=Config(s3={"addressing_style": "virtual"})
    )

def upload_file_to_r2(file_content: bytes, filename: str, content_type: str) -> str:
    """
    Upload un fichier sur Cloudflare R2 et retourne l'URL publique.
    """
    client = get_r2_client()
    if not client:
        raise Exception("Configuration Cloudflare R2 manquante")

    # Générer un nom de fichier unique
    ext = filename.split(".")[-1] if "." in filename else "jpg"
    unique_filename = f"images/{uuid.uuid4()}.{ext}"

    try:
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=unique_filename,
            Body=file_content,
            ContentType=content_type
        )
        
        # Construire l'URL publique
        if settings.r2_public_url_prefix:
            prefix = settings.r2_public_url_prefix.rstrip("/")
            return f"{prefix}/{unique_filename}"
        
        return unique_filename # Retourne le chemin si pas de prefix public
    except Exception as e:
        print(f"Erreur d'upload R2 : {e}")
        raise e
