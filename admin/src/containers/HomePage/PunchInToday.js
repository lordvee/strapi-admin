import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { request } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMapMarkerAlt,
  faChevronLeft,
  faChevronRight,
  faSignInAlt,
  faSignOutAlt,
  faThumbsUp,
  faCheckCircle,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import { Block, SiteStrip, SiteTab, SiteNav, SiteNavBtn, PunchList, PunchRow, PunchMeta, PunchName, PunchTimes, PunchAction, EmptyPunch, StatusPill, ApproveBtn } from './components';

const NONE_SITE = 'none';

const startOfTodayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const displayName = (user) => {
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

const clockLabel = (value) => {
  if (!value) {
    return null;
  }
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format('HH:mm') : null;
};

const siteIdOf = (site) => {
  if (!site) {
    return NONE_SITE;
  }
  if (typeof site === 'object') {
    return site.id != null ? String(site.id) : NONE_SITE;
  }
  return String(site);
};

const siteNameOf = (site) => {
  if (site && typeof site === 'object' && site.name) {
    return site.name;
  }
  return 'No site';
};

const PunchInToday = () => {
  const stripRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = startOfTodayIso();
      const [siteList, sheetList] = await Promise.all([
        request('/sites?_limit=-1', { method: 'GET' }),
        request('/time-sheets?from_gte=' + encodeURIComponent(from) + '&_limit=-1', { method: 'GET' }),
      ]);
      setSites(Array.isArray(siteList) ? siteList : []);
      setSheets(Array.isArray(sheetList) ? sheetList : []);
    } catch (err) {
      setError('Could not load today\'s punch-ins.');
      setSites([]);
      setSheets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    (sites || []).forEach((site) => {
      if (!site || site.id == null) {
        return;
      }
      const id = String(site.id);
      map[id] = { id: id, name: site.name || 'Unnamed site', rows: [] };
    });
    (sheets || []).forEach((sheet) => {
      if (!sheet || !sheet.from) {
        return;
      }
      const id = siteIdOf(sheet.site);
      if (!map[id]) {
        map[id] = { id: id, name: siteNameOf(sheet.site), rows: [] };
      }
      map[id].rows.push(sheet);
    });
    const list = Object.keys(map)
      .map((key) => map[key])
      .sort((a, b) => {
        if (a.id === NONE_SITE) {
          return 1;
        }
        if (b.id === NONE_SITE) {
          return -1;
        }
        return String(a.name).localeCompare(String(b.name));
      });
    return list;
  }, [sites, sheets]);

  useEffect(() => {
    if (!grouped.length) {
      setSelectedSite(null);
      return;
    }
    const stillThere = grouped.some((site) => site.id === selectedSite);
    if (stillThere) {
      return;
    }
    const withPeople = grouped.find((site) => site.rows.length > 0);
    setSelectedSite(withPeople ? withPeople.id : grouped[0].id);
  }, [grouped, selectedSite]);

  const currentIndex = grouped.findIndex((site) => site.id === selectedSite);
  const current = currentIndex >= 0 ? grouped[currentIndex] : null;

  const changeSite = (dir) => {
    if (!grouped.length) {
      return;
    }
    const next = (currentIndex + dir + grouped.length) % grouped.length;
    setSelectedSite(grouped[next].id);
  };

  useEffect(() => {
    if (!stripRef.current) {
      return;
    }
    const active = stripRef.current.querySelector('[data-active="true"]');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedSite]);

  const approve = async (id) => {
    setApprovingId(id);
    try {
      await request('/time-sheets/' + id + '/approve', { method: 'PUT' });
      setSheets((prev) =>
        prev.map((sheet) => (sheet.id === id ? Object.assign({}, sheet, { approved: true }) : sheet))
      );
      strapi.notification.toggle({
        type: 'success',
        message: { id: 'HomePage.punchIn.approved', defaultMessage: 'Time approved' },
      });
    } catch (err) {
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'HomePage.punchIn.approveError', defaultMessage: 'Could not approve this time-sheet' },
      });
    } finally {
      setApprovingId(null);
    }
  };

  const punchedCount = sheets.filter((sheet) => sheet && sheet.from).length;

  return (
    <Block>
      <h2>
        <FontAwesomeIcon icon={faClock} style={{ marginRight: 10 }} />
        <FormattedMessage id="HomePage.punchIn.title" defaultMessage="Punched in today" />
      </h2>
      <p style={{ marginTop: 8, marginBottom: 16, color: '#5c5f66', fontSize: 14 }}>
        <FormattedMessage
          id="HomePage.punchIn.subtitle"
          defaultMessage="{count} {count, plural, one {person} other {people}} clocked in · grouped by site"
          values={{ count: punchedCount }}
        />
      </p>

      {loading && (
        <EmptyPunch>
          <FormattedMessage id="HomePage.punchIn.loading" defaultMessage="Loading today's punch-ins…" />
        </EmptyPunch>
      )}

      {!loading && error && <EmptyPunch>{error}</EmptyPunch>}

      {!loading && !error && grouped.length === 0 && (
        <EmptyPunch>
          <FormattedMessage id="HomePage.punchIn.empty" defaultMessage="No one has punched in yet today." />
        </EmptyPunch>
      )}

      {!loading && !error && grouped.length > 0 && (
        <>
          <SiteNav>
            <SiteNavBtn type="button" onClick={() => changeSite(-1)} aria-label="Previous site">
              <FontAwesomeIcon icon={faChevronLeft} />
            </SiteNavBtn>
            <SiteStrip ref={stripRef}>
              {grouped.map((site) => (
                <SiteTab
                  key={site.id}
                  type="button"
                  $active={site.id === selectedSite}
                  data-active={site.id === selectedSite ? 'true' : undefined}
                  onClick={() => setSelectedSite(site.id)}
                >
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  <span>{site.name}</span>
                  <em>{site.rows.length}</em>
                </SiteTab>
              ))}
            </SiteStrip>
            <SiteNavBtn type="button" onClick={() => changeSite(1)} aria-label="Next site">
              <FontAwesomeIcon icon={faChevronRight} />
            </SiteNavBtn>
          </SiteNav>

          {!current || current.rows.length === 0 ? (
            <EmptyPunch>
              <FormattedMessage
                id="HomePage.punchIn.noneAtSite"
                defaultMessage="No one has punched in at this site today."
              />
            </EmptyPunch>
          ) : (
            <PunchList>
            {current.rows
              .slice()
              .sort((a, b) => String(displayName(a.users)).localeCompare(String(displayName(b.users))))
              .map((sheet) => {
                const fromLabel = clockLabel(sheet.from);
                const untilLabel = clockLabel(sheet.until);
                const canApprove = Boolean(sheet.from && sheet.until && !sheet.approved);
                return (
                  <PunchRow key={sheet.id}>
                    <PunchMeta>
                      <PunchName>{displayName(sheet.users)}</PunchName>
                      <PunchTimes>
                        <span>
                          <FontAwesomeIcon icon={faSignInAlt} /> {fromLabel || '—'}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faSignOutAlt} /> {untilLabel || 'On site'}
                        </span>
                      </PunchTimes>
                    </PunchMeta>
                    <PunchAction>
                      {sheet.approved ? (
                        <StatusPill $ok>
                          <FontAwesomeIcon icon={faCheckCircle} /> Approved
                        </StatusPill>
                      ) : canApprove ? (
                        <ApproveBtn
                          type="button"
                          disabled={approvingId === sheet.id}
                          onClick={() => approve(sheet.id)}
                        >
                          <FontAwesomeIcon icon={faThumbsUp} />
                          {approvingId === sheet.id ? 'Saving…' : 'Approve'}
                        </ApproveBtn>
                      ) : (
                        <StatusPill>Awaiting clock-out</StatusPill>
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
  );
};

export default PunchInToday;
