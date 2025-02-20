# Quote Approval System

A web application for managing quote approvals with dynamic approval workflows based on various conditions.

## Features

- Dynamic form for quote submission
- Real-time approval requirements calculation
- Multi-level approval workflow
- Quote recall functionality
- Modern Material-UI interface

## Prerequisites

- Python 3.11 or 3.12 (Python 3.13 is not supported yet)
- Node.js 14 or higher
- npm or yarn package manager

## Setup

1. Clone the repository
2. Set up the backend:
   ```bash
   # Create and activate a virtual environment (recommended)
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Unix/MacOS:
   source venv/bin/activate

   # Install dependencies
   pip install -r requirements.txt
   python app.py
   ```

3. Set up the frontend:
   ```bash
   npm install
   npm start
   ```

The backend will run on http://localhost:5000 and the frontend will run on http://localhost:3000.

## Usage

1. Fill out the quote form with the required information
2. Submit the quote to see the required approvals
3. Each approver can approve or reject the quote
4. Quotes can be recalled if changes are needed

## Approval Logic

The system implements the following approval requirements:

### Total Amount
- Manager: Required for any amount
- Deal Desk: Required for amounts > $10,000
- Finance: Required for amounts > $50,000
- Legal: Required for amounts > $100,000

### Discount Percentage
- Manager: Required for any discount
- Deal Desk: Required for 20-30% discount
- Finance: Required for >30% discount
- Legal: Required for >40% discount

### Payment Terms
- Manager: Standard terms
- Finance: Required for terms >Net 60
- Legal: Required for terms >Net 90

And more conditions as specified in the approval matrix.

## Troubleshooting

If you encounter errors when running the application:
1. Make sure you're using Python 3.11 or 3.12 (not 3.13)
2. Use a virtual environment to avoid conflicts with system packages
3. Make sure all dependencies are installed correctly

## License

MIT 