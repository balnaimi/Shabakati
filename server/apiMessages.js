/**
 * Shared API-facing English strings (routes, middleware, rate limits).
 * UI copy lives in web/src/locales; discovery templates in i18n/hostDiscovery.json.
 */

export const Err = {
  hostNotFound: 'Host not found',
  tagNotFound: 'Tag not found',
  networkNotFound: 'Network not found',
  favoriteNotFound: 'Favorite not found',
  groupNotFound: 'Group not found',

  unauthorized: 'Unauthorized — please log in',
  unauthorizedAdmin: 'Unauthorized — please log in as admin',
  invalidToken: 'Invalid or expired token',
  invalidUserType: 'Invalid user type',
  forbiddenAdmin: 'Forbidden — admin role required',

  passwordRequired: 'Password is required',
  incorrectVisitorPassword: 'Incorrect visitor password',
  adminPasswordRequired: 'Admin password is required',
  incorrectAdminPassword: 'Incorrect admin password',
  setupAlreadyComplete: 'Setup is already complete',
  visitorPasswordMinLength: 'Visitor password must be at least 3 characters',
  adminPasswordMinLength: 'Admin password must be at least 3 characters',
  currentAndNewPasswordRequired: 'Current password and new password are required',
  newPasswordMinLength: 'New password must be at least 3 characters',
  currentPasswordIncorrect: 'Current password is incorrect',
  failedUpdatePassword: 'Failed to update password',
  newPasswordRequired: 'New password is required',
  visitorAccountNotFound: 'Visitor account not found',
  failedUpdateVisitorPassword: 'Failed to update visitor password',

  invalidIPAddress: 'Invalid IP address',
  tagAlreadyExists: 'Tag already exists',
  hostIdsRequired: 'Host IDs list is required',
  hostIdsArrayRequired: 'hostIds array is required',
  maxHostsPerOperation: 'Maximum 500 hosts per operation',
  maxHostsPerRequest: 'Maximum 500 hosts per request',
  actionAddOrRemove: 'action must be add or remove',
  enablePingOrTcp: 'Enable Ping scan, TCP port scan, or both',
  networkRangeRequired:
    'networkRange is required (e.g. 192.168.30.0/24 or 192.168.30.1-254)',
  networkFieldsRequired: 'Network name, network ID, and subnet are required',
  invalidNetworkName: 'Invalid network name',
  subnetBetween0And32: 'Subnet must be between 0 and 32',
  offlineReleaseNotAllowed: 'offline_release_after_ms value is not allowed',
  hostIdRequired: 'hostId is required',
  groupNameRequired: 'Group name is required',
  groupNameEmpty: 'Group name cannot be empty',
  autoScanIntervalInvalid:
    'Auto-scan interval must be one of: 5, 10, 15, 20, 30, 45, or 60 minutes',

  hostAlreadyInFavorites: 'Host is already in favorites',
  invalidNetworkIdOrSubnet: 'Invalid network ID or subnet',

  cidrRange22to30: 'CIDR range must be between /22 and /30',
  invalidRangeFormat: 'Invalid range format. Use: 192.168.30.1-254',
  invalidIpRange: 'Invalid IP range',

  notFound: 'Not found'
};

export const Msg = {
  loggedInVisitor: 'Logged in as visitor successfully',
  loggedInAdmin: 'Logged in as admin successfully',
  passwordsCreated: 'Passwords created successfully',
  passwordChanged: 'Password changed successfully',
  visitorPasswordUpdated: 'Visitor password updated successfully',

  hostDeleted: 'Host deleted successfully',
  tagDeleted: 'Tag deleted successfully',
  noHostsDeleted: 'No hosts were deleted',
  resultsCleared: 'Results cleared successfully',
  allDataDeleted:
    'All data deleted successfully (hosts, networks, tags, groups, favorites)',
  favoriteRemoved: 'Favorite removed successfully',
  groupDeleted: 'Group deleted successfully',

  rateLimitLogin: 'Too many login attempts. Please try again later.',
  rateLimitAdminLogin: 'Too many admin login attempts. Please try again later.',
  rateLimitSetup: 'Too many setup attempts. Please try again later.'
};

export function hostAlreadyExists(name, ip) {
  return `Host already exists: ${name} (${ip})`;
}

export function deletedHostsCount(n) {
  return `Deleted ${n} host(s)`;
}

export function importedHostsCount(n) {
  return `Successfully imported ${n} host(s)`;
}
