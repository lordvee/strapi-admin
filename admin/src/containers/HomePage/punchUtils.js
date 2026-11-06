import moment from 'moment';

// Shared by the home page's time-sheet panels (PunchInToday, RollCall).

export const NONE_SITE = 'none';

export const displayName = (user) => {
  if (!user) {
    return 'Unknown employee';
  }
  const last = user.lastName || '';
  const first = user.firstName || '';
  if (last && first) {
    return last + ', ' + first;
  }
  return last || first || user.email || user.username || 'Employee';
};

export const clockLabel = (value) => {
  if (!value) {
    return null;
  }
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format('HH:mm') : null;
};

export const siteIdOf = (site) => {
  if (!site) {
    return NONE_SITE;
  }
  if (typeof site === 'object') {
    return site.id != null ? String(site.id) : NONE_SITE;
  }
  return String(site);
};

export const siteNameOf = (site) => {
  if (site && typeof site === 'object' && site.name) {
    return site.name;
  }
  return 'No site';
};
