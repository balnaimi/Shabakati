/**
 * Shared API-facing English strings + stable machine codes for UI translation.
 * UI strings live in web/src/locales under apiErrors.<CODE>.
 */

function def(code, message) {
  return { code, message };
}

export const Err = {
  hostNotFound: def('HOST_NOT_FOUND', 'Host not found'),
  tagNotFound: def('TAG_NOT_FOUND', 'Tag not found'),
  networkNotFound: def('NETWORK_NOT_FOUND', 'Network not found'),
  favoriteNotFound: def('FAVORITE_NOT_FOUND', 'Favorite not found'),
  groupNotFound: def('GROUP_NOT_FOUND', 'Group not found'),

  unauthorized: def('UNAUTHORIZED', 'Unauthorized — please log in'),
  unauthorizedAdmin: def('UNAUTHORIZED_ADMIN', 'Unauthorized — please log in as admin'),
  invalidToken: def('INVALID_TOKEN', 'Invalid or expired token'),
  invalidUserType: def('INVALID_USER_TYPE', 'Invalid user type'),
  forbiddenAdmin: def('FORBIDDEN_ADMIN', 'Forbidden — admin role required'),

  passwordRequired: def('PASSWORD_REQUIRED', 'Password is required'),
  incorrectVisitorPassword: def('INCORRECT_VISITOR_PASSWORD', 'Incorrect visitor password'),
  adminPasswordRequired: def('ADMIN_PASSWORD_REQUIRED', 'Admin password is required'),
  incorrectAdminPassword: def('INCORRECT_ADMIN_PASSWORD', 'Incorrect admin password'),
  setupAlreadyComplete: def('SETUP_ALREADY_COMPLETE', 'Setup is already complete'),
  visitorPasswordMinLength: def(
    'VISITOR_PASSWORD_MIN_LENGTH',
    'Visitor password must be at least 3 characters'
  ),
  adminPasswordMinLength: def(
    'ADMIN_PASSWORD_MIN_LENGTH',
    'Admin password must be at least 3 characters'
  ),
  currentAndNewPasswordRequired: def(
    'CURRENT_AND_NEW_PASSWORD_REQUIRED',
    'Current password and new password are required'
  ),
  newPasswordMinLength: def(
    'NEW_PASSWORD_MIN_LENGTH',
    'New password must be at least 3 characters'
  ),
  currentPasswordIncorrect: def('CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect'),
  failedUpdatePassword: def('FAILED_UPDATE_PASSWORD', 'Failed to update password'),
  newPasswordRequired: def('NEW_PASSWORD_REQUIRED', 'New password is required'),
  visitorAccountNotFound: def('VISITOR_ACCOUNT_NOT_FOUND', 'Visitor account not found'),
  failedUpdateVisitorPassword: def(
    'FAILED_UPDATE_VISITOR_PASSWORD',
    'Failed to update visitor password'
  ),

  invalidIPAddress: def('INVALID_IP_ADDRESS', 'Invalid IP address'),
  tagAlreadyExists: def('TAG_ALREADY_EXISTS', 'Tag already exists'),
  hostIdsRequired: def('HOST_IDS_REQUIRED', 'Host IDs list is required'),
  hostIdsArrayRequired: def('HOST_IDS_ARRAY_REQUIRED', 'hostIds array is required'),
  maxHostsPerOperation: def('MAX_HOSTS_PER_OPERATION', 'Maximum 500 hosts per operation'),
  maxHostsPerRequest: def('MAX_HOSTS_PER_REQUEST', 'Maximum 500 hosts per request'),
  actionAddOrRemove: def('ACTION_ADD_OR_REMOVE', 'action must be add or remove'),
  enablePingOrTcp: def('ENABLE_PING_OR_TCP', 'Enable Ping scan, TCP port scan, or both'),
  networkRangeRequired: def(
    'NETWORK_RANGE_REQUIRED',
    'networkRange is required (e.g. 192.168.30.0/24 or 192.168.30.1-254)'
  ),
  networkFieldsRequired: def(
    'NETWORK_FIELDS_REQUIRED',
    'Network name, network ID, and subnet are required'
  ),
  invalidNetworkName: def('INVALID_NETWORK_NAME', 'Invalid network name'),
  subnetBetween0And32: def('SUBNET_BETWEEN_0_AND_32', 'Subnet must be between 0 and 32'),
  offlineReleaseNotAllowed: def(
    'OFFLINE_RELEASE_NOT_ALLOWED',
    'offline_release_after_ms value is not allowed'
  ),
  hostIdRequired: def('HOST_ID_REQUIRED', 'hostId is required'),
  groupNameRequired: def('GROUP_NAME_REQUIRED', 'Group name is required'),
  groupNameEmpty: def('GROUP_NAME_EMPTY', 'Group name cannot be empty'),
  autoScanIntervalInvalid: def(
    'AUTO_SCAN_INTERVAL_INVALID',
    'Auto-scan interval must be one of: 5, 10, 15, 20, 30, 45, or 60 minutes'
  ),

  hostAlreadyInFavorites: def('HOST_ALREADY_IN_FAVORITES', 'Host is already in favorites'),
  invalidNetworkIdOrSubnet: def(
    'INVALID_NETWORK_ID_OR_SUBNET',
    'Invalid network ID or subnet'
  ),

  cidrRange22to30: def('CIDR_RANGE_22_TO_30', 'CIDR range must be between /22 and /30'),
  invalidRangeFormat: def(
    'INVALID_RANGE_FORMAT',
    'Invalid range format. Use: 192.168.30.1-254'
  ),
  invalidIpRange: def('INVALID_IP_RANGE', 'Invalid IP range'),

  hostNameRequired: def('HOST_NAME_REQUIRED', 'Host name is required'),
  invalidHostName: def('INVALID_HOST_NAME', 'Invalid host name'),
  invalidUrlFormat: def(
    'INVALID_URL',
    'Invalid URL. Use http:// or https://'
  ),
  urlTooLong: def(
    'URL_TOO_LONG',
    'URL is too long (maximum {{max}} characters)'
  ),
  networkIdRequiredField: def('NETWORK_ID_REQUIRED', 'Network ID is required'),
  networkIdInvalidIp: def(
    'NETWORK_ID_INVALID_IP',
    'Network ID must be a valid IPv4 address'
  ),
  subnetNotNumber: def('SUBNET_NOT_NUMBER', 'Subnet must be a number'),
  tagNameRequiredField: def('TAG_NAME_REQUIRED', 'Tag name is required'),
  invalidTagName: def('INVALID_TAG_NAME', 'Invalid tag name'),
  colorRequiredField: def('COLOR_REQUIRED', 'Color is required'),
  invalidColorHex: def(
    'INVALID_COLOR_HEX',
    'Invalid color format. Use hex like #4a9eff'
  ),

  notFound: def('NOT_FOUND', 'Not found')
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

export function errHostAlreadyExists(name, ip) {
  return {
    code: 'HOST_ALREADY_EXISTS',
    message: `Host already exists: ${name} (${ip})`,
    details: { name, ip }
  };
}

export function deletedHostsCount(n) {
  return `Deleted ${n} host(s)`;
}

export function importedHostsCount(n) {
  return `Successfully imported ${n} host(s)`;
}
