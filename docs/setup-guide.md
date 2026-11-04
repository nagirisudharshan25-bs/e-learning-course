# Setup and Deployment Guide

## 1. Quick Start in AI Studio / Local Dev
The application is pre-configured with a full-stack unified runtime on port 3000:
```bash
# Install dependencies
npm install

# Start development server (serves frontend + backend Express REST API on port 3000)
npm run dev

# Run automated tests
node --test tests/analytics.test.ts
```

## 2. Standalone Production Deployment

### Backend (Node.js + Express)
```bash
# Build frontend
npm run build

# Start production server
npm run start
```
Environment variables:
- `PORT`: Server port (default: 3000)
- `DB_HOST`: MySQL 8 host (e.g., `127.0.0.1` or Cloud SQL instance IP)
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name (default: `elearning_analytics`)

### Database (MySQL 8)
1. Initialize the database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. Seed initial data (optional for development):
   ```bash
   mysql -u root -p elearning_analytics < database/seed.sql
   ```

### Python Analytics Package
The Python analytics engine can be run independently or invoked as an asynchronous batch processor:
```bash
cd analytics
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run full analytics calculation
python3 -m analytics.main
```
Requirements:
- Python 3.10+
- Pandas >= 2.0.0
- NumPy >= 1.24.0
- Matplotlib >= 3.7.0
- mysql-connector-python >= 8.0.33
