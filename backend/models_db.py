from tortoise.models import Model
from tortoise import fields

class User(Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True)
    password = fields.CharField(max_length=255, null=True)
    google_id = fields.CharField(max_length=255, null=True)
    avatar_url = fields.CharField(max_length=500, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "users"

class Company(Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255, unique=True)

    class Meta:
        table = "companies"

class Update(Model):
    id = fields.UUIDField(pk=True)
    company = fields.ForeignKeyField('models.Company', related_name='updates', index=True)
    title = fields.CharField(max_length=500)
    summary = fields.JSONField()  # Store bullet points as JSON list
    key_points = fields.JSONField() # Store key points as JSON list
    source_url = fields.CharField(max_length=2048, unique=True)
    tag = fields.CharField(max_length=100)
    published_date = fields.DatetimeField(index=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "updates"

class SearchHistory(Model):
    id = fields.UUIDField(pk=True)
    user = fields.ForeignKeyField('models.User', related_name='search_history', index=True)
    company_name = fields.CharField(max_length=255)
    search_count = fields.IntField(default=1)
    searched_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "search_history"

class Notification(Model):
    id = fields.UUIDField(pk=True)
    user = fields.ForeignKeyField('models.User', related_name='notifications', index=True)
    company_name = fields.CharField(max_length=255)
    message = fields.TextField()
    is_read = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "notifications"
