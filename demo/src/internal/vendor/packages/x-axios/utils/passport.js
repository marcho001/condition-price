export function getLoginToken() {
  if (process.env.NODE_ENV === 'development') {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export function isLoggedIn() {
  return !!(sessionStorage.getItem('token') || localStorage.getItem('token'));
}
