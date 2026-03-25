from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    
class CompanyBase(BaseModel):
    name: str

class CompanyResponse(CompanyBase):
    id: str

class UpdateBase(BaseModel):
    company_id: str
    title: str
    url: str
    summary: str
    published_date: datetime

class UpdateResponse(UpdateBase):
    id: str

class SearchHistoryBase(BaseModel):
    company_name: str

class SearchHistoryResponse(SearchHistoryBase):
    id: str
    user_id: str
    searched_at: datetime
    
class NotificationBase(BaseModel):
    company_name: str
    message: str
    is_read: bool = False

class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    created_at: datetime
