import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';
import { request } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdBadge, faCheck, faTimes, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import {
  Block,
  PunchList,
  PunchRow,
  PunchMeta,
  PunchName,
  PunchTimes,
  PunchAction,
  EmptyPunch,
  RollCallHeader,
  RefreshBtn,
  ApproveBtn,
} from './components';

// Pending visitor sign-in requests (see features/VISITOR-SIGN-IN.md), so an
// administrator can approve or reject without opening the content manager.
// Approving/rejecting goes through the same PUT /visitor-requests/:id the
// content manager uses, so the Visitor user is created, the decision is
// recorded and the visitor-notifications row is written exactly as before.
//
// Always rendered (with an empty state) so it is clear the feature is there
// even when no visitor has registered yet.

const REFRESH_MS = 60 * 1000;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const Photo = styled.div`
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #e9edf5 center / cover no-repeat;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #e3e9f3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8e8ea9;
  font-size: 18px;
`;

const Purpose = styled.div`
  margin-top: 3px;
  font-size: 13px;
  color: #5c5f66;
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.span`
  display: inline-block;
  margin-left: 10px;
  padding: 0 9px;
  border-radius: 10px;
  background: #fff4e5;
  color: #b25e00;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  vertical-align: middle;
`;

const Actions = styled(PunchAction)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RejectBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #f5c6c6;
  border-radius: 4px;
  background: #ffffff;
  color: #d02b20;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #fdecec;
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const NoteInput = styled.input`
  height: 32px;
  width: 220px;
  padding: 0 10px;
  border: 1px solid #e3e9f3;
  border-radius: 4px;
  font-size: 13px;
`;

const ErrorText = styled(EmptyPunch)`
  color: #d02b20;
`;

const mediaUrl = (url) => {
  if (!url) return null;
  if (/^(https?:)?\/\//.test(url)) return url;
  const base = (window.strapi && window.strapi.backendURL) || '';
  return `${String(base).replace(/\/$/, '')}${url}`;
};

const photoOf = (visit) => {
  const file = Array.isArray(visit.photo) ? visit.photo[0] : visit.photo;
  if (!file) return null;
  return mediaUrl((file.formats && file.formats.thumbnail && file.formats.thumbnail.url) || file.url);
};

const visitLabel = (visit) => {
  const start = moment(visit.visitStart);
  const end = visit.validUntil ? moment(visit.validUntil) : null;
  if (!start.isValid()) return '—';
  const from = start.format('ddd D MMM, HH:mm');
  return end && end.isValid() ? `${from}  →  valid until ${end.format('ddd D MMM, HH:mm')}` : from;
};

const VisitorApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await request('/visitor-requests?status=pending&_sort=visitStart:ASC&_limit=-1', {
        method: 'GET',
      });
      setRequests(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError('Could not load visitor requests.');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const decide = async (visit, status, decisionNote) => {
    setBusyId(visit.id);
    setError(null);
    try {
      const body = { status };
      if (decisionNote) body.decisionNote = decisionNote;
      await request(`/visitor-requests/${visit.id}`, { method: 'PUT', body });
      setRequests((prev) => prev.filter((r) => r.id !== visit.id));
      setRejectingId(null);
      setNote('');
    } catch (err) {
      setError(`Could not ${status === 'approved' ? 'approve' : 'reject'} ${visit.firstName} ${visit.lastName}. Please try again.`);
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <Block>
      <RollCallHeader>
        <div>
          <h2>
            <FontAwesomeIcon icon={faIdBadge} style={{ marginRight: 10 }} />
            <FormattedMessage id="HomePage.visitorApprovals.title" defaultMessage="Visitor approval requests" />
            <Count>{requests.length}</Count>
          </h2>
          <p style={{ marginTop: 8, color: '#5c5f66', fontSize: 14 }}>
            <FormattedMessage
              id="HomePage.visitorApprovals.subtitle"
              defaultMessage="Check the photo is clear before approving: it is used for face recognition on the tablet."
            />
          </p>
        </div>
        <RefreshBtn type="button" onClick={load} disabled={loading}>
          <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
          <FormattedMessage id="HomePage.visitorApprovals.refresh" defaultMessage="Refresh" />
        </RefreshBtn>
      </RollCallHeader>

      {error && <ErrorText>{error}</ErrorText>}

      {!requests.length && !error && (
        <EmptyPunch>
          <FormattedMessage
            id="HomePage.visitorApprovals.empty"
            defaultMessage="No pending visitor requests."
          />
        </EmptyPunch>
      )}

      <PunchList style={{ maxHeight: 520 }}>
        {requests.map((visit) => {
          const photo = photoOf(visit);
          const busy = busyId === visit.id;
          const rejecting = rejectingId === visit.id;
          return (
            <PunchRow key={visit.id}>
              <Left>
                <Photo style={photo ? { backgroundImage: `url("${photo}")` } : undefined}>
                  {!photo && <FontAwesomeIcon icon={faIdBadge} />}
                </Photo>
                <PunchMeta>
                  <PunchName>
                    {visit.firstName} {visit.lastName}
                  </PunchName>
                  <PunchTimes>
                    <span>{visit.email}</span>
                    <span>{visitLabel(visit)}</span>
                  </PunchTimes>
                  <Purpose title={visit.purpose}>{visit.purpose}</Purpose>
                </PunchMeta>
              </Left>
              <Actions>
                {rejecting ? (
                  <>
                    <NoteInput
                      autoFocus
                      placeholder="Reason (optional)"
                      value={note}
                      maxLength={250}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') decide(visit, 'rejected', note.trim());
                        if (e.key === 'Escape') setRejectingId(null);
                      }}
                    />
                    <RejectBtn type="button" disabled={busy} onClick={() => decide(visit, 'rejected', note.trim())}>
                      <FontAwesomeIcon icon={faTimes} /> Confirm reject
                    </RejectBtn>
                    <RefreshBtn type="button" onClick={() => setRejectingId(null)}>
                      Cancel
                    </RefreshBtn>
                  </>
                ) : (
                  <>
                    <RejectBtn
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRejectingId(visit.id);
                        setNote('');
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} /> Reject
                    </RejectBtn>
                    <ApproveBtn type="button" disabled={busy} onClick={() => decide(visit, 'approved')}>
                      <FontAwesomeIcon icon={faCheck} /> {busy ? 'Approving…' : 'Approve'}
                    </ApproveBtn>
                  </>
                )}
              </Actions>
            </PunchRow>
          );
        })}
      </PunchList>
    </Block>
  );
};

export default VisitorApprovals;
