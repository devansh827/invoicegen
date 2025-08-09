import './style.css'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp()
})

function initializeApp() {
  // Set default dates
  const today = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(today.getDate() + 30)
  
  document.getElementById('invoiceDate').value = today.toISOString().split('T')[0]
  document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0]
  
  // Generate initial invoice number
  document.getElementById('invoiceNumber').value = `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-001`
  
  // Add event listeners
  setupEventListeners()
  
  // Initial calculations and preview
  calculateTotals()
  generatePreview()
}

function setupEventListeners() {
  // Add item button
  document.getElementById('addItem').addEventListener('click', addItem)
  
  // Generate PDF button
  document.getElementById('generatePdf').addEventListener('click', generatePDF)
  
  // Refresh preview button
  document.getElementById('refreshPreview').addEventListener('click', generatePreview)
  
  // Tax rate change
  document.getElementById('taxRate').addEventListener('input', calculateTotals)
  
  // Form inputs change
  const formInputs = document.querySelectorAll('input, textarea')
  formInputs.forEach(input => {
    input.addEventListener('input', () => {
      if (input.classList.contains('item-quantity') || input.classList.contains('item-rate')) {
        calculateItemAmount(input.closest('.item-row'))
        calculateTotals()
      }
      generatePreview()
    })
  })
  
  // Initial item calculations
  document.querySelectorAll('.item-row').forEach(row => {
    calculateItemAmount(row)
  })
}

function addItem() {
  const container = document.getElementById('itemsContainer')
  const itemRow = document.createElement('div')
  itemRow.className = 'item-row'
  itemRow.innerHTML = `
    <div class="form-group">
      <label>Description</label>
      <input type="text" class="item-description" placeholder="Service or product description" />
    </div>
    <div class="form-group">
      <label>Quantity</label>
      <input type="number" class="item-quantity" value="1" min="1" />
    </div>
    <div class="form-group">
      <label>Rate ($)</label>
      <input type="number" class="item-rate" value="0" min="0" step="0.01" />
    </div>
    <div class="form-group">
      <label>Amount ($)</label>
      <input type="number" class="item-amount" readonly />
    </div>
    <button class="btn-remove" onclick="removeItem(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `
  
  container.appendChild(itemRow)
  
  // Add event listeners to new item
  const quantityInput = itemRow.querySelector('.item-quantity')
  const rateInput = itemRow.querySelector('.item-rate')
  
  quantityInput.addEventListener('input', () => {
    calculateItemAmount(itemRow)
    calculateTotals()
    generatePreview()
  })
  
  rateInput.addEventListener('input', () => {
    calculateItemAmount(itemRow)
    calculateTotals()
    generatePreview()
  })
  
  itemRow.querySelector('.item-description').addEventListener('input', generatePreview)
  
  calculateTotals()
  generatePreview()
}

window.removeItem = function(button) {
  const itemRow = button.closest('.item-row')
  itemRow.remove()
  calculateTotals()
  generatePreview()
}

function calculateItemAmount(itemRow) {
  const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0
  const rate = parseFloat(itemRow.querySelector('.item-rate').value) || 0
  const amount = quantity * rate
  itemRow.querySelector('.item-amount').value = amount.toFixed(2)
}

function calculateTotals() {
  const itemRows = document.querySelectorAll('.item-row')
  let subtotal = 0
  
  itemRows.forEach(row => {
    const amount = parseFloat(row.querySelector('.item-amount').value) || 0
    subtotal += amount
  })
  
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0
  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount
  
  document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`
  document.getElementById('taxAmount').textContent = `$${taxAmount.toFixed(2)}`
  document.getElementById('total').textContent = `$${total.toFixed(2)}`
}

function generatePreview() {
  const preview = document.getElementById('invoicePreview')
  
  // Get form data
  const data = {
    company: {
      name: document.getElementById('companyName').value || 'Your Company',
      address: document.getElementById('companyAddress').value || '',
      email: document.getElementById('companyEmail').value || '',
      phone: document.getElementById('companyPhone').value || ''
    },
    client: {
      name: document.getElementById('clientName').value || 'Client Name',
      address: document.getElementById('clientAddress').value || '',
      email: document.getElementById('clientEmail').value || '',
      phone: document.getElementById('clientPhone').value || ''
    },
    invoice: {
      number: document.getElementById('invoiceNumber').value || 'INV-001',
      date: document.getElementById('invoiceDate').value || '',
      dueDate: document.getElementById('dueDate').value || ''
    },
    notes: document.getElementById('notes').value || ''
  }
  
  // Get items
  const items = []
  document.querySelectorAll('.item-row').forEach(row => {
    const description = row.querySelector('.item-description').value
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0
    const amount = parseFloat(row.querySelector('.item-amount').value) || 0
    
    if (description || quantity || rate) {
      items.push({ description, quantity, rate, amount })
    }
  })
  
  // Get totals
  const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', '')) || 0
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0
  const taxAmount = parseFloat(document.getElementById('taxAmount').textContent.replace('$', '')) || 0
  const total = parseFloat(document.getElementById('total').textContent.replace('$', '')) || 0
  
  // Generate HTML
  preview.innerHTML = createInvoiceHTML(data, items, { subtotal, taxRate, taxAmount, total })
}

function createInvoiceHTML(data, items, totals) {
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  
  const itemsHTML = items.map(item => `
    <tr class="invoice-item">
      <td class="item-description">${item.description || 'Service'}</td>
      <td class="item-quantity">${item.quantity}</td>
      <td class="item-rate">$${item.rate.toFixed(2)}</td>
      <td class="item-amount">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('')
  
  return `
    <div class="invoice-document">
      <div class="invoice-header">
        <div class="company-info">
          <h1 class="company-name">${data.company.name}</h1>
          <div class="company-details">
            ${data.company.address ? `<div class="address">${data.company.address.replace(/\n/g, '<br>')}</div>` : ''}
            <div class="contact-info">
              ${data.company.email ? `<span class="email">${data.company.email}</span>` : ''}
              ${data.company.phone ? `<span class="phone">${data.company.phone}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="invoice-info">
          <h2 class="invoice-title">INVOICE</h2>
          <div class="invoice-details">
            <div class="detail-row">
              <span class="label">Invoice #:</span>
              <span class="value">${data.invoice.number}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date:</span>
              <span class="value">${formatDate(data.invoice.date)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Due Date:</span>
              <span class="value">${formatDate(data.invoice.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="billing-section">
        <div class="bill-to">
          <h3 class="section-title">Bill To:</h3>
          <div class="client-info">
            <div class="client-name">${data.client.name}</div>
            ${data.client.address ? `<div class="client-address">${data.client.address.replace(/\n/g, '<br>')}</div>` : ''}
            <div class="client-contact">
              ${data.client.email ? `<div class="client-email">${data.client.email}</div>` : ''}
              ${data.client.phone ? `<div class="client-phone">${data.client.phone}</div>` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div class="items-section">
        <table class="items-table">
          <thead>
            <tr>
              <th class="desc-header">Description</th>
              <th class="qty-header">Qty</th>
              <th class="rate-header">Rate</th>
              <th class="amount-header">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>
      
      <div class="totals-section">
        <div class="totals-table">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">$${totals.subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Tax (${totals.taxRate}%):</span>
            <span class="total-value">$${totals.taxAmount.toFixed(2)}</span>
          </div>
          <div class="total-row final-total">
            <span class="total-label">Total:</span>
            <span class="total-value">$${totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      ${data.notes ? `
        <div class="notes-section">
          <h3 class="section-title">Notes:</h3>
          <div class="notes-content">${data.notes.replace(/\n/g, '<br>')}</div>
        </div>
      ` : ''}
      
      <div class="invoice-footer">
        <div class="footer-content">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  `
}

async function generatePDF() {
  const button = document.getElementById('generatePdf')
  const originalText = button.innerHTML
  
  // Show loading state
  button.innerHTML = `
    <svg class="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
    Generating...
  `
  button.disabled = true
  
  try {
    // Generate fresh preview
    generatePreview()
    
    // Wait a moment for rendering
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const element = document.getElementById('invoicePreview')
    
    // Create canvas from the invoice preview
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight
    })
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const imgX = (pdfWidth - imgWidth * ratio) / 2
    const imgY = 10
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
    
    // Get invoice number for filename
    const invoiceNumber = document.getElementById('invoiceNumber').value || 'invoice'
    const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    
    // Save the PDF
    pdf.save(filename)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Error generating PDF. Please try again.')
  } finally {
    // Restore button
    button.innerHTML = originalText
    button.disabled = false
  }
}