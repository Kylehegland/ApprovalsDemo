import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const PAYMENT_TERMS_OPTIONS = ['Standard', '>Net 60', '>Net 90'];
const PAYMENT_TYPE_OPTIONS = ['Credit', 'Invoice'];
const BILLING_FREQUENCY_OPTIONS = ['Standard', 'Monthly', 'Custom'];
const SPECIAL_TERMS_OPTIONS = ['None', 'Service Terms', 'Non-standard'];
const PRODUCT_SERVICE_OPTIONS = ['Product', 'Service'];
const CONTRACT_DURATION_OPTIONS = ['Any Duration', '12-24 Months', '>24 Months'];
const DISCOUNT_TYPE_OPTIONS = ['Standard', 'Non-standard'];
const REGION_TERRITORY_OPTIONS = ['Domestic', 'International'];

function App() {
  const [formData, setFormData] = useState({
    total_amount: '',
    discount_percentage: '',
    payment_terms: 'Standard',
    payment_type: 'Credit',
    billing_frequency: 'Standard',
    special_terms: 'None',
    product_service: 'Product',
    contract_duration: 'Any Duration',
    discount_type: 'Standard',
    region_territory: 'Domestic'
  });

  const [quoteId, setQuoteId] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_URL}/quote`, formData);
      setQuoteId(response.data.id);
      fetchQuoteDetails(response.data.id);
      setSuccess('Quote submitted successfully!');
    } catch (err) {
      setError('Failed to submit quote. Please try again.');
      console.error(err);
    }
  };

  const fetchQuoteDetails = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/quote/${id}`);
      setApprovals(response.data.approvals);
    } catch (err) {
      setError('Failed to fetch quote details.');
      console.error(err);
    }
  };

  const handleApproval = async (approverType, status) => {
    try {
      await axios.post(`${API_URL}/quote/${quoteId}/approval`, {
        approver_type: approverType,
        status: status
      });
      fetchQuoteDetails(quoteId);
      setSuccess(`${approverType} ${status.toLowerCase()} the quote.`);
    } catch (err) {
      setError('Failed to update approval status.');
      console.error(err);
    }
  };

  const handleRecall = async () => {
    try {
      await axios.post(`${API_URL}/quote/${quoteId}/recall`);
      fetchQuoteDetails(quoteId);
      setSuccess('Quote recalled successfully.');
    } catch (err) {
      setError('Failed to recall quote.');
      console.error(err);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quote Approval System
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Amount"
                name="total_amount"
                type="number"
                value={formData.total_amount}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Discount Percentage"
                name="discount_percentage"
                type="number"
                value={formData.discount_percentage}
                onChange={handleInputChange}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Payment Terms"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleInputChange}
              >
                {PAYMENT_TERMS_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Payment Type"
                name="payment_type"
                value={formData.payment_type}
                onChange={handleInputChange}
              >
                {PAYMENT_TYPE_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Billing Frequency"
                name="billing_frequency"
                value={formData.billing_frequency}
                onChange={handleInputChange}
              >
                {BILLING_FREQUENCY_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Special Terms"
                name="special_terms"
                value={formData.special_terms}
                onChange={handleInputChange}
              >
                {SPECIAL_TERMS_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Product vs. Service"
                name="product_service"
                value={formData.product_service}
                onChange={handleInputChange}
              >
                {PRODUCT_SERVICE_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Contract Duration"
                name="contract_duration"
                value={formData.contract_duration}
                onChange={handleInputChange}
              >
                {CONTRACT_DURATION_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Discount Type"
                name="discount_type"
                value={formData.discount_type}
                onChange={handleInputChange}
              >
                {DISCOUNT_TYPE_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Region/Territory"
                name="region_territory"
                value={formData.region_territory}
                onChange={handleInputChange}
              >
                {REGION_TERRITORY_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!!quoteId}
            >
              Submit Quote
            </Button>
            {quoteId && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleRecall}
              >
                Recall Quote
              </Button>
            )}
          </Box>
        </form>
      </Paper>

      {approvals.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Approval Status
          </Typography>
          <Stepper orientation="vertical">
            {approvals.map((approval, index) => (
              <Step key={approval.approver_type} active={true}>
                <StepLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography>{approval.approver_type}</Typography>
                    <Typography color={
                      approval.status === 'Approved' ? 'success.main' :
                      approval.status === 'Rejected' ? 'error.main' :
                      'text.secondary'
                    }>
                      ({approval.status})
                    </Typography>
                    {approval.status === 'Pending' && (
                      <Box>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleApproval(approval.approver_type, 'Approved')}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => handleApproval(approval.approver_type, 'Rejected')}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </Box>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}
    </Container>
  );
}

export default App; 