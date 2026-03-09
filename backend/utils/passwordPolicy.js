const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function isStrongPassword(password) {
  return PASSWORD_POLICY_REGEX.test(String(password || ''));
}

function getPasswordPolicyMessage() {
  return 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
}

module.exports = {
  isStrongPassword,
  getPasswordPolicyMessage,
};
