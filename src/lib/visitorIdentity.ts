// Persistent Visitor & Customer Identity Manager
// Ensures the same customer always retains the same Customer ID / Visitor ID across sessions and message requests

export function getOrCreatePersistentCustomerId(): string {
  if (typeof window === 'undefined') {
    return 'cust_anon_' + Date.now();
  }
  let id = localStorage.getItem('novachat_customer_id') || localStorage.getItem('novachat_visitor_id');
  if (!id || id.trim() === '') {
    id = 'cust_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem('novachat_customer_id', id);
      localStorage.setItem('novachat_visitor_id', id);
    } catch (e) {
      console.warn('localStorage access failed:', e);
    }
  }
  return id;
}

export function getSavedCustomerProfile(): { name: string; phone: string; email: string } {
  if (typeof window === 'undefined') {
    return { name: '', phone: '', email: '' };
  }
  return {
    name: localStorage.getItem('novachat_customer_name') || '',
    phone: localStorage.getItem('novachat_customer_phone') || '',
    email: localStorage.getItem('novachat_customer_email') || '',
  };
}

export function saveCustomerProfile(name?: string, phone?: string, email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (name && name.trim()) {
      localStorage.setItem('novachat_customer_name', name.trim());
    }
    if (phone && phone.trim()) {
      const clean = phone.replace(/[^0-9]/g, '');
      localStorage.setItem('novachat_customer_phone', clean || phone.trim());
    }
    if (email && email.trim()) {
      localStorage.setItem('novachat_customer_email', email.trim());
    }
  } catch (e) {
    console.warn('Failed to save customer profile to localStorage:', e);
  }
}
