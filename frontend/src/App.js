import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  HelpOutline as HelpOutlineIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Quote status constants
const QUOTE_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RECALLED: 'Recalled'
};

function App() {
  const [quoteData, setQuoteData] = useState({
    total_amount: '',
    discount_percentage: '',
    payment_terms: 'Standard',
    payment_type: 'Credit',
    billing_frequency: 'Standard',
    special_terms: 'None',
    product_service: 'Product',
    contract_duration: 'Any Duration',
    discount_type: 'Standard',
    region_territory: 'Domestic',
    status: QUOTE_STATUS.DRAFT
  });
  
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [previousQuoteId, setPreviousQuoteId] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [message, setMessage] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Approval rules configuration
  const APPROVAL_RULES = [
    { field: 'Total Amount', condition: 'Any Amount', approver: 'Manager', smart: false },
    { field: 'Total Amount', condition: '>$10,000', approver: 'Deal Desk', smart: true },
    { field: 'Total Amount', condition: '>$50,000', approver: 'Finance', smart: true },
    { field: 'Total Amount', condition: '>$100,000', approver: 'Legal', smart: true },
    { field: 'Discount Percentage', condition: '20% - 30%', approver: 'Deal Desk', smart: true },
    { field: 'Discount Percentage', condition: '>30%', approver: 'Finance', smart: true },
    { field: 'Discount Percentage', condition: '>40%', approver: 'Legal', smart: true },
    { field: 'Product vs. Service', condition: 'Service', approver: 'Services', smart: false },
    { field: 'Special Terms', condition: 'Service Terms', approver: 'Services', smart: false },
    { field: 'Special Terms', condition: 'Non-standard', approver: 'Legal', smart: false },
    // ... other rules
  ];

  useEffect(() => {
    console.log('==========================================');
    console.log('useEffect triggered');
    console.log('Current status:', quoteData.status);
    console.log('Current quote ID:', currentQuoteId);
    console.log('Full quote data:', quoteData);
    console.log('Current approvals:', approvals);
    console.log('==========================================');
    
    if (currentQuoteId) {
      fetchQuoteData();
    }
  }, [currentQuoteId, quoteData.status]);

  useEffect(() => {
    if (currentQuoteId) {
      fetchQuoteHistory();
    }
  }, [currentQuoteId]);

  // Status helper functions
  const isQuoteEditable = quoteData.status === QUOTE_STATUS.DRAFT || 
                         quoteData.status === QUOTE_STATUS.RECALLED ||
                         quoteData.status === QUOTE_STATUS.REJECTED;
  const isQuoteSubmitted = [QUOTE_STATUS.PENDING, QUOTE_STATUS.APPROVED].includes(quoteData.status);
  
  // Check if all approvals are complete and update quote status
  const updateQuoteStatus = (currentApprovals) => {
    console.log('==========================================');
    console.log('updateQuoteStatus called');
    console.log('Current approvals:', currentApprovals);
    
    if (!currentApprovals.length) {
      console.log('No approvals to process');
      return;
    }

    const allApproved = currentApprovals.every(approval => approval.status === 'Approved');
    const anyRejected = currentApprovals.some(approval => approval.status === 'Rejected');

    console.log('All approved:', allApproved);
    console.log('Any rejected:', anyRejected);

    if (allApproved) {
      console.log('Setting status to APPROVED');
      setQuoteData(prev => ({ ...prev, status: QUOTE_STATUS.APPROVED }));
    } else if (anyRejected) {
      console.log('Setting status to REJECTED');
      setQuoteData(prev => ({ ...prev, status: QUOTE_STATUS.REJECTED }));
    } else {
      console.log('Status remains unchanged');
    }
    console.log('==========================================');
  };

  // Update fetchQuoteData to explicitly handle status
  const fetchQuoteData = async () => {
    console.log('=== FETCH QUOTE DATA ===');
    console.log('Attempting to fetch quote data for ID:', currentQuoteId);
    try {
      const url = `http://localhost:5000/api/quote/${currentQuoteId}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data from API:', JSON.stringify(data, null, 2));
      
      if (data.quote) {
        const status = data.quote.status || QUOTE_STATUS.DRAFT;
        console.log('Setting quote status to:', status);
        setQuoteData(prev => {
          const newData = {
            ...data.quote,
            status: status
          };
          console.log('New quote data:', JSON.stringify(newData, null, 2));
          return newData;
        });
        setApprovals(data.approvals);
        setPreviousQuoteId(data.quote.previous_version_id);
        updateQuoteStatus(data.approvals);
      } else {
        console.warn('No quote data in response:', data);
      }
    } catch (error) {
      console.error('Error fetching quote data:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setMessage({ type: 'error', text: `Error fetching quote data: ${error.message}` });
    }
  };

  const fetchQuoteHistory = async () => {
    console.log('=== FETCH QUOTE HISTORY ===');
    try {
      let currentId = currentQuoteId;
      const history = [];
      
      while (currentId) {
        const response = await fetch(`http://localhost:5000/api/quote/${currentId}`);
        const data = await response.json();
        
        if (data.quote) {
          history.push({
            ...data.quote,
            approvals: data.approvals
          });
          currentId = data.quote.previous_version_id;
        } else {
          break;
        }
      }
      
      console.log('Quote history:', history);
      setQuoteHistory(history);
    } catch (error) {
      console.error('Error fetching quote history:', error);
    }
  };

  const handleSubmit = async () => {
    console.log('=== SUBMIT QUOTE ===');
    console.log('Preparing to submit quote with data:', JSON.stringify(quoteData, null, 2));
    try {
      setQuoteData(prev => {
        console.log('Setting status to PENDING before API call');
        return { ...prev, status: QUOTE_STATUS.PENDING };
      });
      
      // When resubmitting after rejection/recall, use the current quote ID as the previous quote ID
      const submitData = {
        ...quoteData,
        previous_quote_id: quoteData.status === QUOTE_STATUS.REJECTED || quoteData.status === QUOTE_STATUS.RECALLED ? currentQuoteId : previousQuoteId,
        status: QUOTE_STATUS.PENDING
      };
      console.log('Submitting data:', JSON.stringify(submitData, null, 2));
      
      const url = 'http://localhost:5000/api/quote';
      console.log('Submitting to URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      console.log('Submit response status:', response.status);
      console.log('Submit response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Submit response data:', JSON.stringify(data, null, 2));
      
      // Create a promise that resolves when the state is actually updated
      const newQuoteId = data.id;
      await new Promise(resolve => {
        setCurrentQuoteId(newQuoteId);
        // Use a setTimeout to ensure the state has updated
        setTimeout(() => {
          if (newQuoteId) {
            console.log('Quote ID set successfully:', newQuoteId);
            resolve();
          }
        }, 0);
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Quote submitted successfully!',
        icon: <CheckCircleIcon />
      });
      
      // Now fetch the quote data with the correct ID
      const fetchResponse = await fetch(`http://localhost:5000/api/quote/${newQuoteId}`);
      if (!fetchResponse.ok) {
        throw new Error(`Error fetching new quote: ${fetchResponse.status}`);
      }
      const fetchedData = await fetchResponse.json();
      console.log('Fetched new quote data:', fetchedData);
      
      if (fetchedData.quote) {
        setQuoteData(prev => ({
          ...fetchedData.quote,
          status: fetchedData.quote.status || QUOTE_STATUS.PENDING
        }));
        setApprovals(fetchedData.approvals || []);
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setQuoteData(prev => ({ ...prev, status: QUOTE_STATUS.DRAFT }));
      setMessage({ type: 'error', text: `Error submitting quote: ${error.message}` });
    }
  };

  const handleApproval = async (approverType, status) => {
    console.log('=== UPDATE APPROVAL ===');
    console.log('Updating approval:', { approverType, status });
    try {
      const url = `http://localhost:5000/api/quote/${currentQuoteId}/approval`;
      console.log('Sending approval to URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver_type: approverType, status })
      });
      
      console.log('Approval response status:', response.status);
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 400 && data.required_sequence) {
          const nextRequired = data.message.split('Waiting for ')[1].split(' approval')[0];
          setMessage({ 
            type: 'warning', 
            text: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Approvals must be completed in the following order:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1} mt={1}>
                  {data.required_sequence.map((approver, index) => (
                    <Box key={approver} display="flex" alignItems="center" gap={1}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: approver === nextRequired ? 'warning.main' : 'text.primary',
                          fontWeight: approver === nextRequired ? 'bold' : 'normal'
                        }}
                      >
                        {index + 1}. {approver} {approver === nextRequired && '(Required Next)'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          });
          return;
        } else if (data.status === 'Rejected') {
          setMessage({
            type: 'error',
            text: (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Quote has been rejected.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  To proceed:
                  <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Make any necessary adjustments</li>
                    <li>Submit the quote for approval again</li>
                  </ol>
                </Typography>
              </Box>
            )
          });
          await fetchQuoteData();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle successful approval/rejection
      if (data.status === 'Rejected') {
        setMessage({
          type: 'error',
          text: (
            <Box>
              <Typography variant="body1" gutterBottom>
                Quote has been rejected.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                To proceed:
                <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>Make any necessary adjustments</li>
                  <li>Submit the quote for approval again</li>
                </ol>
              </Typography>
            </Box>
          )
        });
      } else if (data.status === 'Approved') {
        setMessage({
          type: 'success',
          text: 'Quote has been fully approved!'
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Approval updated successfully'
        });
      }
      
      await fetchQuoteData();
    } catch (error) {
      console.error('Error updating approval:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setMessage({ type: 'error', text: `Error updating approval: ${error.message}` });
    }
  };

  const handleRecall = async () => {
    if (!currentQuoteId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/quote/${currentQuoteId}/recall`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.previous_values) {
        setQuoteData({ ...data.previous_values, status: QUOTE_STATUS.RECALLED });
        fetchQuoteData();
        setMessage({ type: 'success', text: 'Quote recalled successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error recalling quote' });
    }
  };

  const getApprovalStatus = (approverType) => {
    const approval = approvals.find(a => a.approver_type === approverType);
    if (!approval) return null;
    
    const status = {
      text: approval.status,
      color: approval.status === 'Approved' ? 'success' :
             approval.status === 'Rejected' ? 'error' :
             'warning',
      historical: approval.historical,
      smartApproval: approval.smart_approval
    };
    
    if (approval.previous_approval_id) {
      status.text = 'Previously Approved';
      status.retained = true;
    }
    
    if (approval.historical) {
      status.text = `${status.text} (Historical)`;
    } else if (approval.smart_approval) {
      status.text = `${status.text} (Auto-retained)`;
    }
    
    return status;
  };

  const renderApprovalChip = (approverType) => {
    const status = getApprovalStatus(approverType);
    if (!status) return null;

    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          label={`${approverType} (${status.text})`}
          color={status.color}
          icon={status.retained || status.smartApproval ? <HistoryIcon /> : undefined}
          sx={{
            ...(status.historical && {
              opacity: 0.7,
              '& .MuiChip-label': {
                fontStyle: 'italic'
              }
            }),
            ...(status.smartApproval && {
              '& .MuiChip-icon': {
                color: 'info.main'
              }
            })
          }}
        />
        {status.text === 'Pending' && !status.historical && quoteData.status !== QUOTE_STATUS.REJECTED && (
          <>
            <Button
              size="small"
              color="success"
              variant="outlined"
              onClick={() => handleApproval(approverType, 'Approved')}
              startIcon={<CheckCircleIcon />}
              sx={{ minWidth: 'auto' }}
            >
              Approve
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => handleApproval(approverType, 'Rejected')}
              startIcon={<CancelIcon />}
              sx={{ minWidth: 'auto' }}
            >
              Reject
            </Button>
          </>
        )}
      </Box>
    );
  };

  const ApprovalMatrix = ({ open, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Approval Rules Matrix</Typography>
          <IconButton onClick={onClose} size="small">
            <CancelIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label="Smart Rule" size="small" variant="outlined" color="info" />
              Rules that can retain previous approvals if new values are more favorable
            </Box>
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Field</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Required Approval</TableCell>
                <TableCell>Rule Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {APPROVAL_RULES.map((rule, index) => (
                <TableRow key={index}>
                  <TableCell>{rule.field}</TableCell>
                  <TableCell>{rule.condition}</TableCell>
                  <TableCell>
                    <Chip
                      label={rule.approver}
                      size="small"
                      color={
                        rule.approver === 'Manager' ? 'default' :
                        rule.approver === 'Deal Desk' ? 'primary' :
                        rule.approver === 'Finance' ? 'warning' :
                        rule.approver === 'Legal' ? 'error' :
                        'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {rule.smart && (
                      <Chip
                        label="Smart Rule"
                        size="small"
                        variant="outlined"
                        color="info"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );

  // Render status chip separately to ensure it's always visible
  const renderStatusChip = () => {
    console.log('==========================================');
    console.log('renderStatusChip called');
    console.log('Current status:', quoteData.status);
    console.log('Is quote editable:', isQuoteEditable);
    console.log('Is quote submitted:', isQuoteSubmitted);
    console.log('==========================================');

    return (
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: '#fff',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid',
          borderColor: theme => 
            quoteData.status === QUOTE_STATUS.APPROVED ? theme.palette.success.main :
            quoteData.status === QUOTE_STATUS.REJECTED ? theme.palette.error.main :
            quoteData.status === QUOTE_STATUS.PENDING ? theme.palette.warning.main :
            quoteData.status === QUOTE_STATUS.RECALLED ? theme.palette.info.main :
            theme.palette.grey[300],
          ml: 2
        }}
      >
        <Typography variant="body1" sx={{ mr: 1, fontWeight: 'medium' }}>
          Status:
        </Typography>
        {quoteData.status === QUOTE_STATUS.APPROVED && <CheckCircleIcon color="success" />}
        {quoteData.status === QUOTE_STATUS.REJECTED && <CancelIcon color="error" />}
        {quoteData.status === QUOTE_STATUS.PENDING && <WarningIcon color="warning" />}
        {quoteData.status === QUOTE_STATUS.RECALLED && <HistoryIcon color="info" />}
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 'bold',
            color: theme =>
              quoteData.status === QUOTE_STATUS.APPROVED ? theme.palette.success.main :
              quoteData.status === QUOTE_STATUS.REJECTED ? theme.palette.error.main :
              quoteData.status === QUOTE_STATUS.PENDING ? theme.palette.warning.main :
              quoteData.status === QUOTE_STATUS.RECALLED ? theme.palette.info.main :
              theme.palette.text.primary
          }}
        >
          {quoteData.status || QUOTE_STATUS.DRAFT}
        </Typography>
      </Box>
    );
  };

  const QuoteHistoryDialog = ({ open, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Quote History</Typography>
          <IconButton onClick={onClose} size="small">
            <CancelIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            History of changes and approvals for this quote
          </Typography>
        </Box>
        {quoteHistory.map((quote, index) => (
          <Paper key={quote.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                Version {quoteHistory.length - index}
              </Typography>
              <Chip
                label={quote.status}
                color={
                  quote.status === QUOTE_STATUS.APPROVED ? 'success' :
                  quote.status === QUOTE_STATUS.REJECTED ? 'error' :
                  quote.status === QUOTE_STATUS.PENDING ? 'warning' :
                  quote.status === QUOTE_STATUS.RECALLED ? 'info' :
                  'default'
                }
                size="small"
              />
            </Box>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                <Typography>{quote.total_amount}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Discount</Typography>
                <Typography>{quote.discount_percentage}%</Typography>
              </Box>
            </Box>
            {quote.approvals && quote.approvals.length > 0 && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Approvals
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {quote.approvals.map(approval => (
                    <Chip
                      key={approval.approver_type}
                      label={`${approval.approver_type}: ${approval.status}`}
                      size="small"
                      color={
                        approval.status === 'Approved' ? 'success' :
                        approval.status === 'Rejected' ? 'error' :
                        'warning'
                      }
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        ))}
      </DialogContent>
    </Dialog>
  );

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'grey.300'
          }}
        >
          <Typography variant="h4" component="h1">
            Quote Approval System
          </Typography>
          <Box 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            {renderStatusChip()}
            <Tooltip title="View Quote History">
              <IconButton 
                onClick={() => setShowHistory(true)}
                disabled={!currentQuoteId}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Approval Rules">
              <IconButton onClick={() => setShowRules(true)}>
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ 
              mb: 2,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }} 
            onClose={() => setMessage(null)}
            icon={message.type === 'success' ? <CheckCircleIcon /> : undefined}
          >
            {message.text}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <FormControl fullWidth variant="outlined">
              <TextField
                label="Total Amount *"
                value={quoteData.total_amount}
                onChange={(e) => setQuoteData({ ...quoteData, total_amount: e.target.value })}
                required
                disabled={!isQuoteEditable}
                variant="outlined"
                InputProps={{
                  readOnly: !isQuoteEditable,
                }}
              />
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <TextField
                label="Discount Percentage"
                value={quoteData.discount_percentage}
                onChange={(e) => setQuoteData({ ...quoteData, discount_percentage: e.target.value })}
                disabled={!isQuoteEditable}
                variant="outlined"
                InputProps={{
                  readOnly: !isQuoteEditable,
                }}
              />
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="payment-terms-label">Payment Terms</InputLabel>
              <Select
                labelId="payment-terms-label"
                value={quoteData.payment_terms}
                onChange={(e) => setQuoteData({ ...quoteData, payment_terms: e.target.value })}
                disabled={!isQuoteEditable}
                label="Payment Terms"
              >
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Net 60">Net 60</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="payment-type-label">Payment Type</InputLabel>
              <Select
                labelId="payment-type-label"
                value={quoteData.payment_type}
                onChange={(e) => setQuoteData({ ...quoteData, payment_type: e.target.value })}
                disabled={!isQuoteEditable}
                label="Payment Type"
              >
                <MenuItem value="Credit">Credit</MenuItem>
                <MenuItem value="Invoice">Invoice</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="billing-frequency-label">Billing Frequency</InputLabel>
              <Select
                labelId="billing-frequency-label"
                value={quoteData.billing_frequency}
                onChange={(e) => setQuoteData({ ...quoteData, billing_frequency: e.target.value })}
                disabled={!isQuoteEditable}
                label="Billing Frequency"
              >
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Monthly">Monthly</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="special-terms-label">Special Terms</InputLabel>
              <Select
                labelId="special-terms-label"
                value={quoteData.special_terms}
                onChange={(e) => setQuoteData({ ...quoteData, special_terms: e.target.value })}
                disabled={!isQuoteEditable}
                label="Special Terms"
              >
                <MenuItem value="None">None</MenuItem>
                <MenuItem value="Service Terms">Service Terms</MenuItem>
                <MenuItem value="Non-standard">Non-standard</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="product-service-label">Product vs. Service</InputLabel>
              <Select
                labelId="product-service-label"
                value={quoteData.product_service}
                onChange={(e) => setQuoteData({ ...quoteData, product_service: e.target.value })}
                disabled={!isQuoteEditable}
                label="Product vs. Service"
              >
                <MenuItem value="Product">Product</MenuItem>
                <MenuItem value="Service">Service</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="contract-duration-label">Contract Duration</InputLabel>
              <Select
                labelId="contract-duration-label"
                value={quoteData.contract_duration}
                onChange={(e) => setQuoteData({ ...quoteData, contract_duration: e.target.value })}
                disabled={!isQuoteEditable}
                label="Contract Duration"
              >
                <MenuItem value="Any Duration">Any Duration</MenuItem>
                <MenuItem value="12-24 Months">12-24 Months</MenuItem>
                <MenuItem value="Over 24 Months">Over 24 Months</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="discount-type-label">Discount Type</InputLabel>
              <Select
                labelId="discount-type-label"
                value={quoteData.discount_type}
                onChange={(e) => setQuoteData({ ...quoteData, discount_type: e.target.value })}
                disabled={!isQuoteEditable}
                label="Discount Type"
              >
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Non-standard">Non-standard</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="region-territory-label">Region/Territory</InputLabel>
              <Select
                labelId="region-territory-label"
                value={quoteData.region_territory}
                onChange={(e) => setQuoteData({ ...quoteData, region_territory: e.target.value })}
                disabled={!isQuoteEditable}
                label="Region/Territory"
              >
                <MenuItem value="Domestic">Domestic</MenuItem>
                <MenuItem value="International">International</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            {isQuoteEditable && (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!quoteData.total_amount}
                sx={{ bgcolor: 'grey.300', color: 'text.primary' }}
              >
                SUBMIT QUOTE
              </Button>
            )}
            {isQuoteSubmitted && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleRecall}
                sx={{ borderColor: 'error.main', color: 'error.main' }}
              >
                RECALL QUOTE
              </Button>
            )}
          </Box>
        </Paper>

        {approvals.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Approval Status
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {approvals.map((approval, index) => (
                <Box key={approval.approver_type} display="flex" alignItems="center" gap={1}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'primary.main',
                      width: 24,
                      height: 24,
                      fontSize: '0.875rem'
                    }}
                  >
                    {index + 1}
                  </Avatar>
                  {renderApprovalChip(approval.approver_type)}
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </Box>
      
      <ApprovalMatrix open={showRules} onClose={() => setShowRules(false)} />
      <QuoteHistoryDialog open={showHistory} onClose={() => setShowHistory(false)} />
    </Container>
  );
}

export default App;
