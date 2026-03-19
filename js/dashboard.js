// PROTECTED — redirects to login if not logged in
const user = checkAuth();

if (user) {
  // Fill in all user details
  document.getElementById('firstName').textContent = 
    user.fullName.split(' ')[0];
  
  document.getElementById('navGreeting').textContent = 
    'Hi, ' + user.fullName.split(' ')[0];
  
  document.getElementById('userFullName').textContent = user.fullName;
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userRole').textContent = 
    user.role === 'customer' ? 'Customer' : 'Service Provider';

  // Calculate days as member (from when token was created)
  document.getElementById('memberDays').textContent = '1';
}