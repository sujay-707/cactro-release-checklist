import { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import "./App.css";

const STEPS = [
  "All relevant GitHub pull requests have been merged",
  "CHANGELOG.md files have been updated",
  "All tests are passing",
  "Releases in GitHub created",
  "Deployed in demo",
  "Tested thoroughly in demo",
  "Deployed in production",
];

const GET_RELEASES = gql`
  query GetReleases {
    releases {
      id
      name
      date
      status
      additionalInfo
      completedSteps
      createdAt
      updatedAt
    }
  }
`;

const CREATE_RELEASE = gql`
  mutation CreateRelease($input: CreateReleaseInput!) {
    createRelease(input: $input) {
      id name date status additionalInfo completedSteps createdAt updatedAt
    }
  }
`;

const UPDATE_RELEASE = gql`
  mutation UpdateRelease($id: ID!, $input: UpdateReleaseInput!) {
    updateRelease(id: $id, input: $input) {
      id name date status additionalInfo completedSteps createdAt updatedAt
    }
  }
`;

const TOGGLE_STEP = gql`
  mutation ToggleStep($releaseId: ID!, $stepIndex: Int!) {
    toggleStep(releaseId: $releaseId, stepIndex: $stepIndex) {
      id name date status additionalInfo completedSteps createdAt updatedAt
    }
  }
`;

const DELETE_RELEASE = gql`
  mutation DeleteRelease($id: ID!) {
    deleteRelease(id: $id)
  }
`;

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function App() {
  const { data, loading, error, refetch } = useQuery(GET_RELEASES, {
    fetchPolicy: "cache-and-network",
  });

  const [createRelease, { loading: creating }] = useMutation(CREATE_RELEASE);
  const [updateRelease] = useMutation(UPDATE_RELEASE);
  const [toggleStep] = useMutation(TOGGLE_STEP);
  const [deleteRelease] = useMutation(DELETE_RELEASE);

  const releases = data?.releases ?? [];
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = releases.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setName(selected.name);
      setDate(selected.date?.slice(0, 10) ?? "");
      setAdditionalInfo(selected.additionalInfo ?? "");
    } else {
      setName("");
      setDate("");
      setAdditionalInfo("");
    }
  }, [selectedId, selected?.updatedAt]);

  const completed = (release) =>
    release.completedSteps.filter(Boolean).length;

  async function handleSave(event) {
    event.preventDefault();
    setNotice("");
    setSaving(true);

    try {
      if (selected) {
        await updateRelease({
          variables: {
            id: selected.id,
            input: { name: name.trim(), date, additionalInfo },
          },
        });
        setNotice("Release updated successfully.");
      } else {
        const result = await createRelease({
          variables: {
            input: { name: name.trim(), date, additionalInfo },
          },
        });
        setSelectedId(result.data.createRelease.id);
        setNotice("Release created successfully.");
      }

      await refetch();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(release, index) {
    setNotice("");
    try {
      await toggleStep({
        variables: { releaseId: release.id, stepIndex: index },
      });
      await refetch();
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function handleDelete(release) {
    if (!window.confirm(`Delete "${release.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteRelease({ variables: { id: release.id } });
      if (selectedId === release.id) setSelectedId(null);
      await refetch();
      setNotice("Release deleted.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  const doneCount = releases.filter((r) => r.status === "done").length;
  const activeCount = releases.filter((r) => r.status === "ongoing").length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Release Desk home">
          <span className="brand-mark">R</span>
          <span>release<span className="brand-light">desk</span></span>
        </a>
        <span className="topbar-tag"><span className="live-dot" /> RELEASE OPERATIONS</span>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">ENGINEERING WORKSPACE / OVERVIEW</p>
          <h1>Release checklist</h1>
          <p className="subtitle">Ship with confidence. Keep every release on track.</p>
        </div>
        <button className="primary-button" onClick={() => setSelectedId(null)}>
          <span>＋</span> New release
        </button>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">TOTAL RELEASES</span>
          <strong>{releases.length.toString().padStart(2, "0")}</strong>
          <span className="stat-note">All planned and shipped releases</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">IN PROGRESS</span>
          <strong>{activeCount.toString().padStart(2, "0")}</strong>
          <span className="stat-note">Work currently underway</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">SHIPPED</span>
          <strong>{doneCount.toString().padStart(2, "0")}</strong>
          <span className="stat-note">All checklist steps complete</span>
        </article>
      </section>

      {notice && <div className="notice" role="status">{notice}</div>}
      {error && <div className="error-banner">Could not load releases: {error.message}</div>}

      <section className="workspace">
        <div className="release-panel panel">
          <div className="panel-heading">
            <div>
              <h2>All releases</h2>
              <p>Your release pipeline at a glance</p>
            </div>
            <span className="count-pill">{releases.length}</span>
          </div>

          {loading && !data ? (
            <p className="empty-state">Loading releases…</p>
          ) : releases.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">↗</span>
              <h3>No releases yet</h3>
              <p>Create your first release to start tracking the checklist.</p>
              <button className="secondary-button" onClick={() => setSelectedId(null)}>
                Create a release
              </button>
            </div>
          ) : (
            <div className="release-list">
              {releases.map((release) => (
                <button
                  key={release.id}
                  className={`release-row ${selectedId === release.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(release.id)}
                >
                  <span className="release-icon">R</span>
                  <span className="release-info">
                    <strong>{release.name}</strong>
                    <small>{formatDate(release.date)}</small>
                    <span className="mobile-status">
                      {release.status}
                    </span>
                  </span>
                  <span className={`status status-${release.status}`}>
                    <span className="status-dot" />{release.status}
                  </span>
                  <span className="row-progress">
                    <span>{completed(release)}/7</span>
                    <span className="mini-track">
                      <span style={{ width: `${completed(release) / 7 * 100}%` }} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-panel panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{selected ? "RELEASE DETAILS" : "GET STARTED"}</p>
              <h2>{selected ? "Manage release" : "Create a release"}</h2>
              <p>{selected ? "Update details and track readiness." : "Set the basics to kick things off."}</p>
            </div>
            {selected && (
              <button className="icon-button danger" onClick={() => handleDelete(selected)} title="Delete release" aria-label="Delete release">⌫</button>
            )}
          </div>

          <form className="release-form" onSubmit={handleSave}>
            <label>
              Release name <span className="required">*</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. v2.4.0 — Spring release"
                maxLength={200}
                required
              />
            </label>
            <label>
              Target release date <span className="required">*</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label>
              Additional information
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Add notes, links, owners, or deployment details…"
                rows={3}
              />
            </label>
            <button className="primary-button full-width" disabled={saving || creating}>
              {saving || creating ? "Saving…" : selected ? "Save changes" : "Create release"}
            </button>
          </form>

          {selected && (
            <section className="checklist">
              <div className="checklist-heading">
                <div>
                  <h3>Release checklist</h3>
                  <p>Complete each step to ship your release.</p>
                </div>
                <strong>{completed(selected)}/7</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${completed(selected) / 7 * 100}%` }} />
              </div>
              <div className="checklist-items">
                {STEPS.map((step, index) => (
                  <label className={`checklist-item ${selected.completedSteps[index] ? "checked" : ""}`} key={step}>
                    <input
                      type="checkbox"
                      checked={Boolean(selected.completedSteps[index])}
                      onChange={() => handleToggle(selected, index)}
                    />
                    <span className="custom-check">{selected.completedSteps[index] ? "✓" : ""}</span>
                    <span>{step}</span>
                  </label>
                ))}
              </div>
              <div className="status-summary">
                <span>Calculated status</span>
                <span className={`status status-${selected.status}`}>
                  <span className="status-dot" />{selected.status}
                </span>
              </div>
            </section>
          )}
        </div>
      </section>

      <footer className="footer">
        <span>RELEASEDESK <span className="footer-separator">/</span> BUILT FOR BETTER SHIPMENTS</span>
        <span>7 checks · One confident release</span>
      </footer>
    </main>
  );
}

export default App;
