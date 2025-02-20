# Quote Approval System Demo

A demonstration of a quote approval workflow system with smart approval retention.

## Features

- Multi-level approval workflow (Manager, Services, Deal Desk, Finance, Legal)
- Smart approval retention based on favorable changes
- Real-time status updates
- Quote history tracking
- Approval rules matrix
- Support for various quote attributes (amount, discount, terms, etc.)

## Project Structure

- `/frontend` - React frontend application
- `app.py` - Flask backend server
- `db.json` - TinyDB database file (auto-generated)

## Setup

### Backend (Python/Flask)

1. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install flask flask-cors tinydb
```

3. Run the server:
```bash
python app.py
```

### Frontend (React)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Approval Rules

- Manager approval is always required first
- Services team approval is required for:
  - Service products
  - Service-related special terms
- Deal Desk approval is required for:
  - Amounts > $10,000
  - Discounts 20-30%
  - Non-standard discount types
  - Contract duration 12-24 months
- Finance approval is required for:
  - Amounts > $50,000
  - Discounts > 30%
  - Payment terms > Net 60
  - Invoice payment type
  - Monthly billing frequency
- Legal approval is required for:
  - Amounts > $100,000
  - Discounts > 40%
  - Non-standard special terms
  - Contract duration > 24 months
  - International territory

## Smart Approval Retention

The system automatically retains previous approvals when changes are more favorable:
- Lower discount percentages
- Higher total amounts
- Shorter payment terms
- Shorter contract durations 