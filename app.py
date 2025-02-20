from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from tinydb import TinyDB, Query
import os
import json

app = Flask(__name__)
CORS(app)

# Initialize TinyDB
DB_PATH = 'db.json'

# Create db.json if it doesn't exist or is corrupted
try:
    with open(DB_PATH, 'r') as f:
        json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    with open(DB_PATH, 'w') as f:
        json.dump({'_default': {}}, f)

db = TinyDB(DB_PATH)
quotes = db.table('quotes')
approvals = db.table('approvals')
Quote = Query()
Approval = Query()

def determine_required_approvals(quote_data):
    # Define the approval order - this ensures approvals happen in sequence
    APPROVAL_ORDER = ['Manager', 'Services', 'Deal Desk', 'Finance', 'Legal']
    
    needed_approvals = []
    
    # Manager is always required first
    needed_approvals.append('Manager')
    
    # Total Amount checks
    amount = float(quote_data['total_amount'])
    if amount > 10000:
        needed_approvals.append('Deal Desk')
    if amount > 50000:
        needed_approvals.append('Finance')
    if amount > 100000:
        needed_approvals.append('Legal')
    
    # Discount Percentage checks
    if 'discount_percentage' in quote_data and quote_data['discount_percentage']:
        discount = float(quote_data['discount_percentage'])
        if 20 <= discount <= 30:
            needed_approvals.append('Deal Desk')
        if discount > 30:
            needed_approvals.append('Finance')
        if discount > 40:
            needed_approvals.append('Legal')
    
    # Payment Terms checks
    if quote_data.get('payment_terms') == 'Net 60':
        needed_approvals.append('Finance')
    
    # Payment Type checks
    if quote_data.get('payment_type') == 'Invoice':
        needed_approvals.append('Finance')
    
    # Billing Frequency checks
    if quote_data.get('billing_frequency') == 'Monthly':
        needed_approvals.append('Finance')
    
    # Special Terms checks
    special_terms = quote_data.get('special_terms')
    if special_terms == 'Service Terms':
        needed_approvals.append('Services')
    elif special_terms == 'Non-standard':
        needed_approvals.append('Legal')
    
    # Contract Duration checks
    duration = quote_data.get('contract_duration')
    if duration == '12-24 Months':
        needed_approvals.append('Deal Desk')
    elif duration == '>24 Months':
        needed_approvals.append('Legal')
    
    # Remove duplicates while maintaining order
    seen = set()
    ordered_approvals = []
    for approver in APPROVAL_ORDER:
        if approver in needed_approvals and approver not in seen:
            ordered_approvals.append(approver)
            seen.add(approver)
    
    return ordered_approvals

def is_value_more_desirable(old_value, new_value, field_name):
    if field_name == 'discount_percentage':
        # Lower discount is more desirable
        return float(new_value or 0) <= float(old_value or 0)
    elif field_name == 'total_amount':
        # Higher amount is more desirable for the company
        return float(new_value) >= float(old_value)
    elif field_name in ['payment_terms', 'contract_duration']:
        # Shorter terms/duration is more desirable
        term_order = {
            'Standard': 1,
            'Net 60': 2,
            '>Net 90': 3,
            'Any Duration': 1,
            '12-24 Months': 2,
            '>24 Months': 3
        }
        return term_order.get(new_value, 1) <= term_order.get(old_value, 1)
    # For other fields, any change requires re-approval
    return False

def should_keep_approval(old_quote, new_quote, approver_type):
    """Determine if an existing approval should be kept based on field changes."""
    if approver_type == 'Manager':
        # Manager always needs to re-approve
        return False
        
    # Check each field that affects this approver
    if approver_type == 'Deal Desk':
        amount_threshold = 10000
        discount_threshold = 20
        
        # Check if either old or new quote requires Deal Desk approval for amount
        old_needs_amount_approval = float(old_quote['total_amount']) > amount_threshold
        new_needs_amount_approval = float(new_quote['total_amount']) > amount_threshold
        
        # If both need approval, check if new value is more favorable
        if old_needs_amount_approval and new_needs_amount_approval:
            if not is_value_more_desirable(old_quote['total_amount'], new_quote['total_amount'], 'total_amount'):
                return False
        # If only new quote needs approval, require new approval
        elif new_needs_amount_approval:
            return False
            
        # Similar logic for discount
        old_discount = float(old_quote.get('discount_percentage') or 0)
        new_discount = float(new_quote.get('discount_percentage') or 0)
        
        # Check if either old or new quote requires Deal Desk approval for discount
        old_needs_discount_approval = old_discount >= discount_threshold
        new_needs_discount_approval = new_discount >= discount_threshold
        
        # If old quote needed approval and new quote has a more favorable discount, keep the approval
        if old_needs_discount_approval:
            if new_discount <= old_discount:  # New discount is lower or equal (more favorable)
                return True
            else:  # New discount is higher (less favorable)
                return False
        # If new quote needs approval but old didn't, require new approval
        elif new_needs_discount_approval:
            return False
                
    elif approver_type == 'Finance':
        amount_threshold = 50000
        discount_threshold = 30
        
        old_needs_amount_approval = float(old_quote['total_amount']) > amount_threshold
        new_needs_amount_approval = float(new_quote['total_amount']) > amount_threshold
        
        if old_needs_amount_approval and new_needs_amount_approval:
            if not is_value_more_desirable(old_quote['total_amount'], new_quote['total_amount'], 'total_amount'):
                return False
        elif new_needs_amount_approval:
            return False
            
        old_discount = float(old_quote.get('discount_percentage') or 0)
        new_discount = float(new_quote.get('discount_percentage') or 0)
        
        # Check if either old or new quote requires Finance approval for discount
        old_needs_discount_approval = old_discount >= discount_threshold
        new_needs_discount_approval = new_discount >= discount_threshold
        
        # If old quote needed approval and new quote has a more favorable discount, keep the approval
        if old_needs_discount_approval:
            if new_discount <= old_discount:  # New discount is lower or equal (more favorable)
                return True
            else:  # New discount is higher (less favorable)
                return False
        # If new quote needs approval but old didn't, require new approval
        elif new_needs_discount_approval:
            return False
                
    elif approver_type == 'Legal':
        amount_threshold = 100000
        discount_threshold = 40
        
        old_needs_amount_approval = float(old_quote['total_amount']) > amount_threshold
        new_needs_amount_approval = float(new_quote['total_amount']) > amount_threshold
        
        if old_needs_amount_approval and new_needs_amount_approval:
            if not is_value_more_desirable(old_quote['total_amount'], new_quote['total_amount'], 'total_amount'):
                return False
        elif new_needs_amount_approval:
            return False
            
        old_discount = float(old_quote.get('discount_percentage') or 0)
        new_discount = float(new_quote.get('discount_percentage') or 0)
        
        # Check if either old or new quote requires Legal approval for discount
        old_needs_discount_approval = old_discount >= discount_threshold
        new_needs_discount_approval = new_discount >= discount_threshold
        
        # If old quote needed approval and new quote has a more favorable discount, keep the approval
        if old_needs_discount_approval:
            if new_discount <= old_discount:  # New discount is lower or equal (more favorable)
                return True
            else:  # New discount is higher (less favorable)
                return False
        # If new quote needs approval but old didn't, require new approval
        elif new_needs_discount_approval:
            return False
    
    return True

@app.route('/api/quote', methods=['POST'])
def create_quote():
    data = request.json
    previous_quote_id = data.pop('previous_quote_id', None)
    
    # Add metadata
    data['created_at'] = datetime.now().isoformat()
    data['status'] = 'Pending'
    if previous_quote_id:
        data['previous_version_id'] = previous_quote_id
    
    # Insert quote
    quote_id = quotes.insert(data)
    
    # Get previous quote and approvals if this is a resubmission
    previous_approvals = []
    previous_quote = None
    if previous_quote_id:
        previous_quote = quotes.get(doc_id=int(previous_quote_id))
        # Get all previous approvals, including historical ones
        previous_approvals = approvals.search(Approval.quote_id == int(previous_quote_id))
    
    # Create approval records
    required_approvals = determine_required_approvals(data)
    for approver_type in required_approvals:
        approval_data = {
            'quote_id': quote_id,
            'approver_type': approver_type,
            'status': 'Pending',
            'updated_at': datetime.now().isoformat(),
            'historical': False
        }
        
        # Check if we can keep the previous approval
        if previous_quote and previous_approvals:
            prev_approval = next((a for a in previous_approvals if a['approver_type'] == approver_type), None)
            if (prev_approval and 
                prev_approval['status'] == 'Approved' and 
                should_keep_approval(previous_quote, data, approver_type)):
                approval_data['status'] = 'Approved'
                approval_data['previous_approval_id'] = prev_approval.doc_id
                approval_data['smart_approval'] = True  # Flag to indicate this was a smart approval
        
        approvals.insert(approval_data)
    
    return jsonify({'message': 'Quote created successfully', 'id': quote_id})

@app.route('/api/quote/<int:quote_id>', methods=['GET'])
def get_quote(quote_id):
    quote = quotes.get(doc_id=quote_id)
    if not quote:
        return jsonify({'message': 'Quote not found'}), 404
        
    quote_approvals = approvals.search(Approval.quote_id == quote_id)
    return jsonify({
        'quote': quote,
        'approvals': quote_approvals
    })

@app.route('/api/quote/<int:quote_id>/approval', methods=['POST'])
def update_approval(quote_id):
    data = request.json
    
    # Get the quote and all its approvals
    quote = quotes.get(doc_id=quote_id)
    if not quote:
        return jsonify({'message': 'Quote not found'}), 404
    
    quote_approvals = approvals.search(Approval.quote_id == quote_id)
    required_approvals = determine_required_approvals(quote)
    
    # Find the index of the current approver in the required sequence
    try:
        current_approver_index = required_approvals.index(data['approver_type'])
    except ValueError:
        return jsonify({'message': 'Invalid approver type'}), 400
    
    # Check if all previous approvers have approved
    for i in range(current_approver_index):
        previous_approver = required_approvals[i]
        previous_approval = next((a for a in quote_approvals if a['approver_type'] == previous_approver), None)
        if not previous_approval or previous_approval['status'] != 'Approved':
            return jsonify({
                'message': f'Cannot approve. Waiting for {previous_approver} approval first.',
                'required_sequence': required_approvals
            }), 400
    
    # Find and update the approval
    approval = approvals.get(
        (Approval.quote_id == quote_id) & 
        (Approval.approver_type == data['approver_type'])
    )
    
    if not approval:
        return jsonify({'message': 'Approval not found'}), 404
    
    # If this is a rejection, update the quote status and mark approvals as historical
    if data['status'] == 'Rejected':
        # Update quote status to Rejected
        quotes.update({'status': 'Rejected'}, doc_ids=[quote_id])
        
        # Mark all existing approvals as historical
        quote_approvals = approvals.search(Approval.quote_id == quote_id)
        for approval in quote_approvals:
            approvals.update({
                'historical': True,
                'updated_at': datetime.now().isoformat()
            }, doc_ids=[approval.doc_id])
        
        return jsonify({
            'message': 'Quote rejected. You can make changes and submit again.',
            'status': 'Rejected'
        })
    
    # Update the approval status
    approvals.update({
        'status': data['status'],
        'updated_at': datetime.now().isoformat()
    }, doc_ids=[approval.doc_id])
    
    # If all approvals are complete and approved, update quote status
    all_approvals = approvals.search(Approval.quote_id == quote_id)
    if all(a['status'] == 'Approved' for a in all_approvals):
        quotes.update({'status': 'Approved'}, doc_ids=[quote_id])
        return jsonify({
            'message': 'Quote fully approved!',
            'status': 'Approved'
        })
    
    return jsonify({
        'message': 'Approval updated successfully',
        'required_sequence': required_approvals
    })

@app.route('/api/quote/<int:quote_id>/recall', methods=['POST'])
def recall_quote(quote_id):
    quote = quotes.get(doc_id=quote_id)
    if not quote:
        return jsonify({'message': 'Quote not found'}), 404
    
    # Check if quote is in a state that can be recalled
    if quote.get('status') not in ['Pending', 'Approved']:
        return jsonify({
            'message': 'Quote cannot be recalled. Only pending or approved quotes can be recalled.'
        }), 400
    
    # Update quote status to Recalled
    quotes.update({'status': 'Recalled'}, doc_ids=[quote_id])
    
    # Mark all approvals as historical
    quote_approvals = approvals.search(Approval.quote_id == quote_id)
    for approval in quote_approvals:
        approvals.update({
            'historical': True,
            'updated_at': datetime.now().isoformat()
        }, doc_ids=[approval.doc_id])
    
    return jsonify({
        'message': 'Quote recalled successfully',
        'previous_values': quote
    })

if __name__ == '__main__':
    app.run(debug=True) 