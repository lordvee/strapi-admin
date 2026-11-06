import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { request } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck,
  faCheck,
  faMapMarkerAlt,
  faSignInAlt,
  faSignOutAlt,
  faSyncAlt,
} from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import {
  Block,
  SiteStrip,
  SiteTab,
  SiteNav,
  PunchList,
  PunchRow,
  PunchMeta,
  PunchName,
  PunchTimes,
  PunchAction,
  EmptyPunch,
  StatusPill,
  RollCallButton,
  RollCallHeader,
  RollCallSummary,
  RefreshBtn,
  VisitorBadge,
  CheckToggle,
  CheckedTag,
  UndoBtn,
} from './components';
import { displayName, clockLabel, siteIdOf, siteNameOf } from './punchUtils';

// Site roll call: everyone clocked in (employees and visitors) who hasn't
// clocked out, or clocked out within the last hour - see the server's
// time-sheet onSite controller. The officer ticks people off as they're
// accounted for.
//
// Ticks are kept in this browser only (localStorage, keyed by time-sheet id)
// so a refresh mid-evacuation doesn't lose them; they are not shared with
// other admins or the tablet.

const ALL_SITES = 'all';
const REFRESH_MS = 60 * 1000;
const CHECKS_KEY = 'punchin.rollCall.checks';
// Ticks older than this are dropped on load - a roll call is a same-day job.
const CHECK_TTL_MS = 24 * 60 * 60 * 1000;

const loadChecks = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHECKS_KEY) || '{}');
    const cutoff = Date.now() - CHECK_TTL_MS;
    return Object.keys(raw).reduce((acc, id) => {
      if (typeof raw[id] === 'number' && raw[id] >= cutoff) {
        acc[id] = raw[id];
      }
      return acc;
    }, {});
  } catch (err) {
    return {};
  }
};

const saveChecks = (checks) => {
  try {
    window.localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
  } catch (err) {
    // Storage unavailable (private window, quota) - ticks still work for this page view.
  }
};

// Clock-in time, with the date when it wasn't today so a forgotten clock-out
// from an earlier day stands out instead of reading as "on site now".
const clockInLabel = (value) => {
  const parsed = moment(value);
  if (!parsed.isValid()) {
    return '—';
  }
  return parsed.isSame(moment(), 'day') ? parsed.format('HH:mm') : parsed.format('D MMM HH:mm');
};

const RollCall = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [loadedAt, setLoadedAt] = useState(null);
  const [selectedSite, setSelectedSite] = useState(ALL_SITES);
  const [checks, setChecks] = useState(loadChecks);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await request('/time-sheets/on-site', { method: 'GET' });
      setSheets(Array.isArray(list) ? list : []);
      setLoadedAt(new Date());
    } catch (err) {
      setError('Could not load the roll call. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [open, load]);

  const setChecked = (id, isChecked) => {
    setChecks((prev) => {
      const next = Object.assign({}, prev);
      if (isChecked) {
        next[id] = Date.now();
      } else {
        delete next[id];
      }
      saveChecks(next);
      return next;
    });
  };

  const sites = useMemo(() => {
    const map = {};
    sheets.forEach((sheet) => {
      const id = siteIdOf(sheet.site);
      if (!map[id]) {
        map[id] = { id: id, name: siteNameOf(sheet.site), count: 0 };
      }
      map[id].count += 1;
    });
    return Object.keys(map)
      .map((key) => map[key])
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [sheets]);

  useEffect(() => {
    if (selectedSite !== ALL_SITES && !sites.some((site) => site.id === selectedSite)) {
      setSelectedSite(ALL_SITES);
    }
  }, [sites, selectedSite]);

  // Still on site first, then those who've left; alphabetical within each.
  // Order doesn't change when someone is ticked, so rows don't jump under
  // the officer's cursor.
  const rows = useMemo(
    () =>
      sheets
        .filter((sheet) => selectedSite === ALL_SITES || siteIdOf(sheet.site) === selectedSite)
        .slice()
        .sort((a, b) => {
          if (!a.until !== !b.until) {
            return a.until ? 1 : -1;
          }
          return String(displayName(a.users)).localeCompare(String(displayName(b.users)));
        }),
    [sheets, selectedSite]
  );

  const onSiteCount = rows.filter((sheet) => !sheet.until).length;
  const leftCount = rows.length - onSiteCount;
  const checkedCount = rows.filter((sheet) => checks[sheet.id]).length;

  return (
    <>
      <RollCallButton type="button" $open={open} aria-expanded={open} onClick={() => setOpen(!open)}>
        <FontAwesomeIcon icon={faClipboardCheck} />
        {open ? (
          <FormattedMessage id="HomePage.rollCall.hide" defaultMessage="Hide site roll call" />
        ) : (
          <FormattedMessage id="HomePage.rollCall.button" defaultMessage="Site roll call" />
        )}
      </RollCallButton>

      {open && (
        <Block>
          <RollCallHeader>
            <div>
              <h2>
                <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: 10 }} />
                <FormattedMessage id="HomePage.rollCall.title" defaultMessage="Site roll call" />
              </h2>
              <p style={{ marginTop: 8, color: '#5c5f66', fontSize: 14 }}>
                <FormattedMessage
                  id="HomePage.rollCall.subtitle"
                  defaultMessage="Everyone clocked in, including visitors, plus anyone who clocked out in the last hour."
                />
              </p>
            </div>
            <RefreshBtn type="button" onClick={load} disabled={loading}>
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
              {loadedAt ? (
                <FormattedMessage
                  id="HomePage.rollCall.updated"
                  defaultMessage="Updated {time}"
                  values={{ time: moment(loadedAt).format('HH:mm') }}
                />
              ) : (
                <FormattedMessage id="HomePage.rollCall.refresh" defaultMessage="Refresh" />
              )}
            </RefreshBtn>
          </RollCallHeader>

          {error && <EmptyPunch>{error}</EmptyPunch>}

          {!error && loading && !loadedAt && (
            <EmptyPunch>
              <FormattedMessage id="HomePage.rollCall.loading" defaultMessage="Loading roll call…" />
            </EmptyPunch>
          )}

          {!error && loadedAt && (
            <>
              <RollCallSummary>
                <span>
                  <FormattedMessage
                    id="HomePage.rollCall.onSite"
                    defaultMessage="{count} on site"
                    values={{ count: <b>{onSiteCount}</b> }}
                  />
                </span>
                <span>
                  <FormattedMessage
                    id="HomePage.rollCall.left"
                    defaultMessage="{count} left in the last hour"
                    values={{ count: <b>{leftCount}</b> }}
                  />
                </span>
                <span>
                  <FormattedMessage
                    id="HomePage.rollCall.checkedCount"
                    defaultMessage="{checked} of {total} checked"
                    values={{ checked: <b>{checkedCount}</b>, total: rows.length }}
                  />
                </span>
              </RollCallSummary>

              {sites.length > 1 && (
                <SiteNav>
                  <SiteStrip>
                    <SiteTab
                      type="button"
                      $active={selectedSite === ALL_SITES}
                      onClick={() => setSelectedSite(ALL_SITES)}
                    >
                      <FormattedMessage id="HomePage.rollCall.allSites" defaultMessage="All sites" />
                      <em>{sheets.length}</em>
                    </SiteTab>
                    {sites.map((site) => (
                      <SiteTab
                        key={site.id}
                        type="button"
                        $active={site.id === selectedSite}
                        onClick={() => setSelectedSite(site.id)}
                      >
                        <FontAwesomeIcon icon={faMapMarkerAlt} />
                        <span>{site.name}</span>
                        <em>{site.count}</em>
                      </SiteTab>
                    ))}
                  </SiteStrip>
                </SiteNav>
              )}

              {rows.length === 0 ? (
                <EmptyPunch>
                  <FormattedMessage
                    id="HomePage.rollCall.empty"
                    defaultMessage="No one is clocked in, and no one has clocked out in the last hour."
                  />
                </EmptyPunch>
              ) : (
                <PunchList style={{ maxHeight: 520 }}>
                  {rows.map((sheet) => {
                    const isChecked = Boolean(checks[sheet.id]);
                    return (
                      <PunchRow key={sheet.id}>
                        <PunchMeta>
                          <PunchName>
                            {displayName(sheet.users)}
                            {sheet.isVisitor && (
                              <VisitorBadge>
                                <FormattedMessage id="HomePage.rollCall.visitor" defaultMessage="Visitor" />
                              </VisitorBadge>
                            )}
                          </PunchName>
                          <PunchTimes>
                            <span>
                              <FontAwesomeIcon icon={faSignInAlt} /> {clockInLabel(sheet.from)}
                            </span>
                            {sheet.until ? (
                              <span>
                                <FontAwesomeIcon icon={faSignOutAlt} />
                                <FormattedMessage
                                  id="HomePage.rollCall.leftAt"
                                  defaultMessage="Left at {time}"
                                  values={{ time: clockLabel(sheet.until) || '—' }}
                                />
                              </span>
                            ) : (
                              <StatusPill style={{ height: 18, padding: '0 8px', fontSize: 11 }}>
                                <FormattedMessage id="HomePage.rollCall.stillOnSite" defaultMessage="On site" />
                              </StatusPill>
                            )}
                            {selectedSite === ALL_SITES && sites.length > 1 && (
                              <span>
                                <FontAwesomeIcon icon={faMapMarkerAlt} /> {siteNameOf(sheet.site)}
                              </span>
                            )}
                          </PunchTimes>
                        </PunchMeta>
                        <PunchAction>
                          {isChecked ? (
                            <>
                              <CheckedTag>
                                <FontAwesomeIcon icon={faCheck} />
                                <FormattedMessage id="HomePage.rollCall.checked" defaultMessage="Checked" />
                              </CheckedTag>
                              <UndoBtn type="button" onClick={() => setChecked(sheet.id, false)}>
                                <FormattedMessage id="HomePage.rollCall.undo" defaultMessage="Undo" />
                              </UndoBtn>
                            </>
                          ) : (
                            <CheckToggle>
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => setChecked(sheet.id, true)}
                              />
                              <FormattedMessage id="HomePage.rollCall.checked" defaultMessage="Checked" />
                            </CheckToggle>
                          )}
                        </PunchAction>
                      </PunchRow>
                    );
                  })}
                </PunchList>
              )}
            </>
          )}
        </Block>
      )}
    </>
  );
};

export default RollCall;
