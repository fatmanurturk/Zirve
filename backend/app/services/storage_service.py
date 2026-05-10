# filepath: backend/app/services/storage_service.py
import os
import shutil
from abc import ABC, abstractmethod
from fastapi import UploadFile

class StorageService(ABC):
    @abstractmethod
    async def save_file(self, file: UploadFile, path: str) -> str:
        pass

    @abstractmethod
    async def delete_file(self, path: str):
        pass

class LocalStorageService(StorageService):
    def __init__(self, base_path: str = "uploads"):
        self.base_path = base_path
        if not os.path.exists(self.base_path):
            os.makedirs(self.base_path)

    async def save_file(self, file: UploadFile, path: str) -> str:
        full_path = os.path.join(self.base_path, path)
        directory = os.path.dirname(full_path)
        if not os.path.exists(directory):
            os.makedirs(directory)
        
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return path

    async def delete_file(self, path: str):
        full_path = os.path.join(self.base_path, path)
        if os.path.exists(full_path):
            os.remove(full_path)

# Dependency to get storage service
def get_storage_service() -> StorageService:
    return LocalStorageService()
