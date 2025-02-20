from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from tinydb import TinyDB, Query
import os

app = Flask(__name__)
CORS(app)

# Initialize TinyDB
db = TinyDB('db.json')
quotes = db.table('quotes')
approvals = db.table('approvals')
Quote = Query()
Approval = Query()

# Clear existing data to reset schema
quotes.truncate()
approvals.truncate()

# No need to define schema in TinyDB as it's schemaless
# The previous_approval_id will be added automatically when we use it

def determine_required_approvals(quote_data):
    # Initialize sets for each approver type
    required_approvers = {
        'Manager': False,
        'Services': False,
        'Deal Desk': False,
        'Finance': False,
        'Legal': False
    }
    
    # Manager is always required - blanket rule
    required_approvers['Manager'] = True
    
    # Total Amount check - only Finance for >100k (not smart)
    amount = float(quote_data['total_amount'])
    if amount > 100000:
        required_approvers['Finance'] = True
    
    # Discount Percentage checks
    if 'discount_percentage' in quote_data and quote_data['discount_percentage']:
        discount = float(quote_data['discount_percentage'])
        if 20 <= discount <= 30:
            required_approvers['Deal Desk'] = True
        if discount > 30:
            required_approvers['Finance'] = True
        if discount > 40:
            required_approvers['Legal'] = True
    
    # Payment Terms checks
    if quote_data.get('payment_terms') == '>Net 60':
        required_approvers['Finance'] = True
    
    # Payment Type checks
    if quote_data.get('payment_type') == 'Invoice':
        required_approvers['Finance'] = True
    
    # Billing Frequency checks
    if quote_data.get('billing_frequency') == 'Monthly':
        required_approvers['Finance'] = True
    
    # Special Terms checks
    special_terms = quote_data.get('special_terms')
    if special_terms == 'Service Terms':
        required_approvers['Services'] = True
    elif special_terms == 'Non-standard':
        required_approvers['Legal'] = True
    
    # Product vs Service checks
    if quote_data.get('product_service') == 'Service':
        required_approvers['Services'] = True
    
    # Contract Duration checks
    duration = quote_data.get('contract_duration')
    if duration == '12-24 Months':
        required_approvers['Deal Desk'] = True
    elif duration == '>24 Months':
        required_approvers['Legal'] = True
    
    # Discount Type checks
    if quote_data.get('discount_type') == 'Non-standard':
        required_approvers['Deal Desk'] = True
    
    # Region/Territory checks
    if quote_data.get('region_territory') == 'International':
        required_approvers['Legal'] = True
    
    # Return approvers in the specified order, only if they are required
    ordered_approvers = ['Manager', 'Services', 'Deal Desk', 'Finance', 'Legal']
    return [approver for approver in ordered_approvers if required_approvers[approver]]

def is_value_more_desirable(old_value, new_value, field_name):
    if field_name == 'discount_percentage':
        # Lower discount is more desirable
        return float(new_value or 0) <= float(old_value or 0)
    elif field_name == 'total_amount':
        # Lower amount is more desirable
        return float(new_value) <= float(old_value)
    elif field_name in ['payment_terms', 'contract_duration']:
        # Shorter terms/duration is more desirable
        term_order = {
            'Standard': 1,
            '>Net 60': 2,
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
        
    # For each approver, check if any of their relevant fields have changed unfavorably
    if approver_type == 'Deal Desk':
        # Check discount percentage
        old_discount = float(old_quote.get('discount_percentage') or 0)
        new_discount = float(new_quote.get('discount_percentage') or 0)
        if 20 <= old_discount <= 30 and 20 <= new_discount <= 30:
            if new_discount > old_discount:  # Less favorable
                return False
        elif 20 <= new_discount <= 30 and old_discount < 20:
            return False
            
        # Check contract duration
        if old_quote.get('contract_duration') == '12-24 Months':
            if new_quote.get('contract_duration') != old_quote.get('contract_duration'):
                return False
                
        # Check discount type
        if new_quote.get('discount_type') == 'Non-standard' and old_quote.get('discount_type') != 'Non-standard':
            return False
            
        # If none of the Deal Desk's fields changed unfavorably, keep the approval
        return True
                
    elif approver_type == 'Finance':
        # Amount over 100k is not a smart rule, always needs re-approval
        new_amount = float(new_quote['total_amount'])
        if new_amount > 100000:
            return False
            
        # Check discount percentage
        old_discount = float(old_quote.get('discount_percentage') or 0)
        new_discount = float(new_quote.get('discount_percentage') or 0)
        if old_discount > 30 and new_discount > 30:
            if new_discount > old_discount:  # Less favorable
                return False
        elif new_discount > 30 and old_discount <= 30:
            return False
            
        # Check payment terms
        if new_quote.get('payment_terms') == '>Net 60' and old_quote.get('payment_terms') != '>Net 60':
            return False
            
        # Check payment type
        if new_quote.get('payment_type') == 'Invoice' and old_quote.get('payment_type') != 'Invoice':
            return False
            
        # Check billing frequency
        if new_quote.get('billing_frequency') == 'Monthly' and old_quote.get('billing_frequency') != 'Monthly':
            return False
            
        # If none of Finance's fields changed unfavorably, keep the approval
        return True
                
    elif approver_type == 'Legal':
        # Check discount percentage
        old_discount = float(old_quote.get('discount_percentage') or 0)
        new_discount = float(new_quote.get('discount_percentage') or 0)
        if old_discount > 40 and new_discount > 40:
            if new_discount > old_discount:  # Less favorable
                return False
        elif new_discount > 40 and old_discount <= 40:
            return False
            
        # Check contract duration
        if new_quote.get('contract_duration') == '>24 Months' and old_quote.get('contract_duration') != '>24 Months':
            return False
            
        # Check special terms
        if new_quote.get('special_terms') == 'Non-standard' and old_quote.get('special_terms') != 'Non-standard':
            return False
            
        # Check region/territory
        if new_quote.get('region_territory') == 'International' and old_quote.get('region_territory') != 'International':
            return False
            
        # If none of Legal's fields changed unfavorably, keep the approval
        return True
        
    elif approver_type == 'Services':
        # Check if any Services-specific fields have changed
        if (new_quote.get('special_terms') == 'Service Terms' and old_quote.get('special_terms') != 'Service Terms') or \
           (new_quote.get('product_service') == 'Service' and old_quote.get('product_service') != 'Service'):
            return False
            
        # If none of Services' fields changed, keep the approval
        return True
    
    return True

@app.route('/api/quote', methods=['POST'])
def create_quote():
    data = request.json
    previous_quote_id = data.pop('previous_quote_id', None)
    
    print(f"Creating quote with previous_quote_id: {previous_quote_id}")
    
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
        if previous_quote:
            previous_approvals = approvals.search(Approval.quote_id == int(previous_quote_id))
            print(f"Found previous quote: {previous_quote}")
            print(f"Found previous approvals: {previous_approvals}")
    
    # Create approval records
    required_approvals = determine_required_approvals(data)
    print(f"Required approvals for new quote: {required_approvals}")
    
    for approver_type in required_approvals:
        approval_data = {
            'quote_id': quote_id,
            'approver_type': approver_type,
            'status': 'Pending',
            'updated_at': datetime.now().isoformat()
        }
        
        # Check if we can keep the previous approval
        if previous_quote and previous_approvals:
            prev_approval = next((a for a in previous_approvals if a['approver_type'] == approver_type), None)
            if prev_approval:
                print(f"Found previous approval for {approver_type}: {prev_approval}")
                should_keep = should_keep_approval(previous_quote, data, approver_type)
                print(f"Should keep {approver_type} approval? {should_keep}")
                # Check the original_status if it exists, otherwise fall back to status
                was_approved = prev_approval.get('original_status', prev_approval['status']) == 'Approved'
                if was_approved and should_keep:
                    print(f"Keeping approval for {approver_type}")
                    approval_data['status'] = 'Approved'
                    approval_data['previous_approval_id'] = prev_approval.doc_id
        
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
    
    # Find and update the approval
    approval = approvals.get(
        (Approval.quote_id == quote_id) & 
        (Approval.approver_type == data['approver_type'])
    )
    
    if not approval:
        return jsonify({'message': 'Approval not found'}), 404

    # Get all approvals for this quote
    quote_approvals = approvals.search(Approval.quote_id == quote_id)
    
    # Define the approval order
    approval_order = ['Manager', 'Services', 'Deal Desk', 'Finance', 'Legal']
    
    # Get the index of the current approver
    current_approver_index = approval_order.index(data['approver_type'])
    
    # Check if all previous approvers have approved
    for prev_approver in approval_order[:current_approver_index]:
        prev_approval = next((a for a in quote_approvals if a['approver_type'] == prev_approver), None)
        if prev_approval and prev_approval['status'] != 'Approved':
            return jsonify({
                'message': f'Cannot approve. {prev_approver} must approve first.',
                'error': 'INVALID_APPROVAL_ORDER'
            }), 400
    
    # If all checks pass, update the approval
    update_data = {
        'status': data['status'],
        'updated_at': datetime.now().isoformat(),
        'original_status': data['status']  # Store the actual approval status
    }
    
    approvals.update(update_data, doc_ids=[approval.doc_id])
    
    return jsonify({'message': 'Approval updated successfully'})

@app.route('/api/quote/<int:quote_id>/recall', methods=['POST'])
def recall_quote(quote_id):
    quote = quotes.get(doc_id=quote_id)
    if not quote:
        return jsonify({'message': 'Quote not found'}), 404
    
    # Update quote status
    quotes.update({'status': 'Recalled'}, doc_ids=[quote_id])
    
    # Reset all approvals to pending but preserve previous approval references and original status
    quote_approvals = approvals.search(Approval.quote_id == quote_id)
    for approval in quote_approvals:
        approvals.update({
            'status': 'Pending',
            'updated_at': datetime.now().isoformat(),
            'original_status': approval['status']  # Store the original status
        }, doc_ids=[approval.doc_id])
    
    return jsonify({
        'message': 'Quote recalled successfully',
        'previous_values': quote
    })

if __name__ == '__main__':
    app.run(debug=True) 