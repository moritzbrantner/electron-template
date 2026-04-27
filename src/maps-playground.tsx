import '@moritzbrantner/maps/styles.css';

import {
  ClusteredMap,
  TemporalClusteredMap,
  type AggregatedMapFeature,
  type MapPoint,
  type MapPointFilter,
  type TemporalMapTrack,
  type VisibleAggregationSummary,
} from '@moritzbrantner/maps';
import { StrictMode, useMemo, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

type DemoRegion = 'all' | 'europe' | 'north-america' | 'asia';
type DemoPointRegion = Exclude<DemoRegion, 'all'>;
type DemoCategory = 'delivery' | 'sensor' | 'incident';
type DemoStatus = 'nominal' | 'watch' | 'critical';
type DemoMode = 'rail' | 'air' | 'sea';

type DemoPointProperties = {
  category: DemoCategory;
  city: string;
  region: DemoPointRegion;
  status: DemoStatus;
};

type DemoTrackProperties = {
  mode: DemoMode;
  region: DemoPointRegion;
  route: string;
};

const regionLabels: Record<DemoRegion, string> = {
  all: 'All regions',
  asia: 'Asia',
  europe: 'Europe',
  'north-america': 'North America',
};

const categoryLabels: Record<DemoCategory, string> = {
  delivery: 'Delivery',
  incident: 'Incident',
  sensor: 'Sensor',
};

const modeLabels: Record<DemoMode, string> = {
  air: 'Air',
  rail: 'Rail',
  sea: 'Sea',
};

const timeStepOptions: Array<{ label: string; value: number | 'any' }> = [
  { label: 'Smooth', value: 'any' },
  { label: '6 hours', value: 6 * 60 * 60 * 1000 },
  { label: '12 hours', value: 12 * 60 * 60 * 1000 },
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
];

const regionViewState: Record<DemoRegion, { center: [number, number]; zoom: number }> = {
  all: { center: [17, 28], zoom: 1.35 },
  asia: { center: [113, 24], zoom: 2.35 },
  europe: { center: [12, 49], zoom: 3.05 },
  'north-america': { center: [-97, 39], zoom: 2.35 },
};

const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  notation: 'compact',
});
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: '2-digit',
  hour12: false,
  month: 'short',
  minute: '2-digit',
  timeZone: 'UTC',
});

const clusteredPoints = createClusteredPoints();
const temporalTracks = createTemporalTracks();
const temporalDefaultTime = temporalTracks[0]?.frames[0]?.time ?? 0;

let mapsPlaygroundRoot: Root | null = null;

export function mountMapsPlayground(container: HTMLElement) {
  mapsPlaygroundRoot = createRoot(container);
  mapsPlaygroundRoot.render(
    <StrictMode>
      <MapsPlayground />
    </StrictMode>,
  );
}

export function unmountMapsPlayground() {
  mapsPlaygroundRoot?.unmount();
  mapsPlaygroundRoot = null;
}

function MapsPlayground() {
  const [region, setRegion] = useState<DemoRegion>('all');
  const [activeCategories, setActiveCategories] = useState<DemoCategory[]>(['delivery', 'sensor', 'incident']);
  const [activeModes, setActiveModes] = useState<DemoMode[]>(['rail', 'air', 'sea']);
  const [clusterRadius, setClusterRadius] = useState(56);
  const [fitToData, setFitToData] = useState(true);
  const [showAttributionControl, setShowAttributionControl] = useState(false);
  const [temporalAutoPlay, setTemporalAutoPlay] = useState(true);
  const [temporalLoop, setTemporalLoop] = useState(true);
  const [showPlaybackControls, setShowPlaybackControls] = useState(true);
  const [timeStep, setTimeStep] = useState<number | 'any'>('any');
  const [playbackRate, setPlaybackRate] = useState(10);
  const [clusterFeature, setClusterFeature] = useState<AggregatedMapFeature<DemoPointProperties> | null>(null);
  const [temporalFeature, setTemporalFeature] = useState<AggregatedMapFeature<DemoTrackProperties> | null>(null);
  const [clusterSummary, setClusterSummary] = useState<VisibleAggregationSummary | null>(null);
  const [temporalSummary, setTemporalSummary] = useState<VisibleAggregationSummary | null>(null);
  const [activeTime, setActiveTime] = useState<number>(temporalDefaultTime);

  const filteredPoints = useMemo(
    () =>
      clusteredPoints.filter((point) => {
        const properties = point.properties;

        if (!properties) {
          return false;
        }

        return (region === 'all' || properties.region === region) && activeCategories.includes(properties.category);
      }),
    [activeCategories, region],
  );
  const filteredTracks = useMemo(
    () =>
      temporalTracks.filter((track) => {
        const properties = track.properties;

        if (!properties) {
          return false;
        }

        return (region === 'all' || properties.region === region) && activeModes.includes(properties.mode);
      }),
    [activeModes, region],
  );
  const clusterFilter = useMemo<MapPointFilter<DemoPointProperties>>(
    () => (point) => {
      const properties = point.properties;

      return (region === 'all' || properties.region === region) && activeCategories.includes(properties.category);
    },
    [activeCategories, region],
  );
  const totalVolume = filteredPoints.reduce((sum, point) => sum + (point.metrics?.volume ?? 0), 0);
  const totalIncidents = filteredPoints.reduce((sum, point) => sum + (point.metrics?.incidents ?? 0), 0);
  const currentViewState = regionViewState[region];
  const visibleModesCopy = filteredTracks.length > 0 ? filteredTracks.length : 0;
  const scenarioDefaultTime = getDefaultTimeForSelection(region, activeModes);
  const temporalMapKey = `${region}:${activeModes.join(',')}`;

  return (
    <div className="maps-playground">
      <section className="maps-hero">
        <div className="maps-hero__copy">
          <span className="maps-hero__eyebrow">Renderer sandbox</span>
          <h2>Explore clustered and temporal maps side by side</h2>
          <p>
            This page mounts the real <code>@moritzbrantner/maps</code> components with deterministic demo data, live
            prop controls, and inspector panels wired to the package callbacks.
          </p>
        </div>
        <div className="maps-stat-grid">
          <StatCard label="Filtered points" value={numberFormatter.format(filteredPoints.length)} />
          <StatCard label="Visible track sets" value={numberFormatter.format(visibleModesCopy)} />
          <StatCard label="Volume total" value={compactFormatter.format(totalVolume)} />
          <StatCard label="Incident total" value={numberFormatter.format(totalIncidents)} />
        </div>
      </section>

      <div className="maps-layout">
        <aside className="maps-sidebar">
          <ControlCard description="Drive the static clustered dataset." title="Cluster controls">
            <div className="maps-filter-row">
              {(['all', 'europe', 'north-america', 'asia'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === region ? 'maps-pill is-active' : 'maps-pill'}
                  onClick={() => {
                    setRegion(value);
                    setClusterFeature(null);
                    setTemporalFeature(null);
                    setActiveTime(getDefaultTimeForSelection(value, activeModes));
                  }}
                >
                  {regionLabels[value]}
                </button>
              ))}
            </div>
            <div className="maps-filter-row">
              {(['delivery', 'sensor', 'incident'] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  className={activeCategories.includes(category) ? 'maps-pill is-active' : 'maps-pill'}
                  onClick={() => {
                    setActiveCategories((current) => toggleArrayValue(current, category));
                    setClusterFeature(null);
                  }}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>
            <label className="maps-control">
              <span>Cluster radius</span>
              <div className="maps-control__row">
                <input
                  type="range"
                  min="24"
                  max="96"
                  step="4"
                  value={clusterRadius}
                  onChange={(event) => {
                    setClusterRadius(Number(event.target.value));
                  }}
                />
                <strong>{clusterRadius}px</strong>
              </div>
            </label>
            <label className="maps-switch">
              <input
                type="checkbox"
                checked={fitToData}
                onChange={(event) => {
                  setFitToData(event.target.checked);
                }}
              />
              <span>Fit map view to active data</span>
            </label>
            <label className="maps-switch">
              <input
                type="checkbox"
                checked={showAttributionControl}
                onChange={(event) => {
                  setShowAttributionControl(event.target.checked);
                }}
              />
              <span>Show attribution control</span>
            </label>
          </ControlCard>

          <ControlCard description="Tune the timeline layer and animation behaviour." title="Temporal controls">
            <div className="maps-filter-row">
              {(['rail', 'air', 'sea'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={activeModes.includes(mode) ? 'maps-pill is-active' : 'maps-pill'}
                  onClick={() => {
                    setActiveModes((current) => {
                      const nextModes = toggleArrayValue(current, mode);
                      setActiveTime(getDefaultTimeForSelection(region, nextModes));
                      return nextModes;
                    });
                    setTemporalFeature(null);
                  }}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
            <label className="maps-control">
              <span>Time step</span>
              <select
                className="maps-select"
                value={String(timeStep)}
                onChange={(event) => {
                  setTimeStep(event.target.value === 'any' ? 'any' : Number(event.target.value));
                }}
              >
                {timeStepOptions.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="maps-control">
              <span>Playback rate</span>
              <div className="maps-control__row">
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="1"
                  value={playbackRate}
                  onChange={(event) => {
                    setPlaybackRate(Number(event.target.value));
                  }}
                />
                <strong>{playbackRate}x</strong>
              </div>
            </label>
            <label className="maps-switch">
              <input
                type="checkbox"
                checked={temporalAutoPlay}
                onChange={(event) => {
                  setTemporalAutoPlay(event.target.checked);
                }}
              />
              <span>Auto-play timeline</span>
            </label>
            <label className="maps-switch">
              <input
                type="checkbox"
                checked={temporalLoop}
                onChange={(event) => {
                  setTemporalLoop(event.target.checked);
                }}
              />
              <span>Loop playback</span>
            </label>
            <label className="maps-switch">
              <input
                type="checkbox"
                checked={showPlaybackControls}
                onChange={(event) => {
                  setShowPlaybackControls(event.target.checked);
                }}
              />
              <span>Show built-in playback controls</span>
            </label>
          </ControlCard>

          <DataCard
            description="Click clusters or points in the map surfaces to inspect what the package emits."
            rows={describeFeature(clusterFeature)}
            title="Static selection"
          />
          <DataCard
            description="Temporal selections include interpolated track properties."
            rows={describeFeature(temporalFeature)}
            title="Temporal selection"
          />
        </aside>

        <div className="maps-stack">
          <article className="maps-surface-card">
            <div className="maps-surface-card__header">
              <div>
                <span className="maps-surface-card__eyebrow">ClusteredMap</span>
                <h3>Static activity clusters</h3>
              </div>
              <p>Pan, zoom, and click into clusters to inspect aggregate metrics and individual point properties.</p>
            </div>
            <ClusteredMap<DemoPointProperties>
              className="maps-map"
              clusterRadius={clusterRadius}
              filterPoint={clusterFilter}
              fitToData={fitToData}
              initialViewState={currentViewState}
              mapLabel="Clustered logistics activity"
              onFeatureSelect={setClusterFeature}
              onViewportAggregationChange={setClusterSummary}
              points={clusteredPoints}
              showAttributionControl={showAttributionControl}
              style={{ minHeight: '30rem' }}
            />
            <div className="maps-detail-grid">
              <DataCard
                description="The viewport aggregation summary comes directly from the component callback."
                rows={describeSummary(clusterSummary)}
                title="Viewport summary"
              />
              <DataCard
                description="The filtered dataset gives you a quick sanity check against the map state."
                rows={[
                  createDataRow('Active region', regionLabels[region]),
                  createDataRow('Active categories', activeCategories.map((value) => categoryLabels[value]).join(', ')),
                  createDataRow('Point count', numberFormatter.format(filteredPoints.length)),
                  createDataRow('Volume sum', compactFormatter.format(totalVolume)),
                ]}
                title="Dataset snapshot"
              />
            </div>
          </article>

          <article className="maps-surface-card">
            <div className="maps-surface-card__header">
              <div>
                <span className="maps-surface-card__eyebrow">TemporalClusteredMap</span>
                <h3>Animated route playback</h3>
              </div>
              <p>
                The timeline scrubs between route keyframes while preserving the same clustering and selection
                behaviour.
              </p>
            </div>
            <TemporalClusteredMap<DemoTrackProperties>
              key={temporalMapKey}
              autoPlay={temporalAutoPlay}
              className="maps-map"
              defaultTime={scenarioDefaultTime}
              fitToData={fitToData}
              formatTimeLabel={formatTime}
              initialViewState={currentViewState}
              loopPlayback={temporalLoop}
              mapLabel="Temporal route activity"
              onFeatureSelect={setTemporalFeature}
              onTimeChange={setActiveTime}
              onViewportAggregationChange={setTemporalSummary}
              playbackRate={playbackRate * 60 * 60 * 1000}
              showAttributionControl={showAttributionControl}
              showPlaybackControls={showPlaybackControls}
              style={{ minHeight: '28rem' }}
              timeStep={timeStep}
              timelineLabel="Route playback timeline"
              tracks={filteredTracks}
            />
            <div className="maps-detail-grid">
              <DataCard
                description="This summary reflects the current time slice and current viewport."
                rows={describeSummary(temporalSummary)}
                title="Temporal viewport"
              />
              <DataCard
                description="Use the built-in timeline or switch regions and modes to reset the scenario."
                rows={[
                  createDataRow('Active region', regionLabels[region]),
                  createDataRow('Active modes', activeModes.map((value) => modeLabels[value]).join(', ')),
                  createDataRow('Track count', numberFormatter.format(filteredTracks.length)),
                  createDataRow('Current time', formatTime(activeTime)),
                ]}
                title="Playback state"
              />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="maps-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ControlCard({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="maps-panel-card">
      <div className="maps-panel-card__header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="maps-panel-card__body">{children}</div>
    </section>
  );
}

function DataCard({
  description,
  rows,
  title,
}: {
  description: string;
  rows: Array<[label: string, value: string]>;
  title: string;
}) {
  return (
    <section className="maps-panel-card">
      <div className="maps-panel-card__header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="maps-empty-state">No selection yet.</p>
      ) : (
        <dl className="maps-data-list">
          {rows.map(([label, value]) => (
            <div key={`${title}-${label}`} className="maps-data-list__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function toggleArrayValue<T extends string>(values: readonly T[], value: T) {
  if (values.includes(value)) {
    return values.length === 1 ? [...values] : values.filter((entry) => entry !== value);
  }

  return [...values, value];
}

function createDataRow(label: string, value: string): [string, string] {
  return [label, value];
}

function describeFeature<TProperties extends Record<string, unknown>>(
  feature: AggregatedMapFeature<TProperties> | null,
): Array<[label: string, value: string]> {
  if (!feature) {
    return [];
  }

  if (feature.kind === 'cluster') {
    return [
      createDataRow('Kind', 'Cluster'),
      createDataRow('Point count', numberFormatter.format(feature.pointCount)),
      createDataRow('Expansion zoom', feature.expansionZoom.toFixed(2)),
      createDataRow('Coordinates', `${feature.coordinates[1].toFixed(3)}, ${feature.coordinates[0].toFixed(3)}`),
      createDataRow('Metrics', formatMetrics(feature.metrics)),
    ];
  }

  const properties = feature.point.properties as Record<string, string | number | undefined>;

  return [
    createDataRow('Kind', 'Point'),
    createDataRow('Label', feature.point.label),
    createDataRow('Coordinates', `${feature.coordinates[1].toFixed(3)}, ${feature.coordinates[0].toFixed(3)}`),
    createDataRow('Properties', formatProperties(properties)),
    createDataRow('Metrics', formatMetrics(feature.metrics)),
  ];
}

function describeSummary(summary: VisibleAggregationSummary | null): Array<[label: string, value: string]> {
  if (!summary) {
    return [];
  }

  return [
    createDataRow('Zoom', summary.zoom.toFixed(2)),
    createDataRow('Visible clusters', numberFormatter.format(summary.visibleClusterCount)),
    createDataRow('Visible points', numberFormatter.format(summary.visiblePointCount)),
    createDataRow('Unclustered points', numberFormatter.format(summary.visibleUnclusteredCount)),
    createDataRow('Metrics', formatMetrics(summary.metrics)),
  ];
}

function formatMetrics(metrics: Record<string, number>) {
  const entries = Object.entries(metrics);

  if (entries.length === 0) {
    return 'None';
  }

  return entries.map(([key, value]) => `${key}: ${compactFormatter.format(value)}`).join(' | ');
}

function formatProperties(properties: Record<string, string | number | undefined>) {
  const entries = Object.entries(properties).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return 'None';
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
}

function formatTime(time: number) {
  return `${timeFormatter.format(time)} UTC`;
}

function getDefaultTimeForSelection(region: DemoRegion, modes: readonly DemoMode[]) {
  const nextTrack = temporalTracks.find((track) => {
    const properties = track.properties;

    if (!properties) {
      return false;
    }

    return (region === 'all' || properties.region === region) && modes.includes(properties.mode);
  });

  return nextTrack?.frames[0]?.time ?? temporalDefaultTime;
}

function createClusteredPoints(): Array<MapPoint<DemoPointProperties>> {
  const hubs = [
    { city: 'Berlin', latitude: 52.52, longitude: 13.405, region: 'europe' },
    { city: 'Amsterdam', latitude: 52.3676, longitude: 4.9041, region: 'europe' },
    { city: 'Milan', latitude: 45.4642, longitude: 9.19, region: 'europe' },
    { city: 'Athens', latitude: 37.9838, longitude: 23.7275, region: 'europe' },
    { city: 'New York', latitude: 40.7128, longitude: -74.006, region: 'north-america' },
    { city: 'Chicago', latitude: 41.8781, longitude: -87.6298, region: 'north-america' },
    { city: 'Toronto', latitude: 43.6532, longitude: -79.3832, region: 'north-america' },
    { city: 'Mexico City', latitude: 19.4326, longitude: -99.1332, region: 'north-america' },
    { city: 'Tokyo', latitude: 35.6762, longitude: 139.6503, region: 'asia' },
    { city: 'Seoul', latitude: 37.5665, longitude: 126.978, region: 'asia' },
    { city: 'Singapore', latitude: 1.3521, longitude: 103.8198, region: 'asia' },
    { city: 'Bangkok', latitude: 13.7563, longitude: 100.5018, region: 'asia' },
  ] as const satisfies ReadonlyArray<{
    city: string;
    latitude: number;
    longitude: number;
    region: DemoPointRegion;
  }>;
  const categories: DemoCategory[] = ['delivery', 'sensor', 'incident'];

  return hubs.flatMap((hub, hubIndex) =>
    Array.from({ length: 18 }, (_, pointIndex) => {
      const random = createDeterministicRandom(hubIndex * 100 + pointIndex + 7);
      const category = categories[(hubIndex + pointIndex) % categories.length];
      const incidents = Math.round(random() * 4 + (category === 'incident' ? 4 : 0));
      const status: DemoStatus = incidents >= 7 ? 'critical' : incidents >= 4 ? 'watch' : 'nominal';
      const volume = Math.round(30 + random() * 180);
      const priority = Math.round(45 + random() * 55);

      return {
        id: `${hub.region}-${hub.city}-${pointIndex + 1}`,
        label: `${hub.city} ${categoryLabels[category]} ${pointIndex + 1}`,
        latitude: hub.latitude + (random() - 0.5) * 2.1,
        longitude: hub.longitude + (random() - 0.5) * 2.6,
        metrics: {
          incidents,
          priority,
          volume,
        },
        properties: {
          category,
          city: hub.city,
          region: hub.region,
          status,
        },
      } satisfies MapPoint<DemoPointProperties>;
    }),
  );
}

function createTemporalTracks(): Array<TemporalMapTrack<DemoTrackProperties>> {
  const start = Date.UTC(2026, 3, 15, 6, 0, 0);

  return [
    buildTrack({
      id: 'eu-rail',
      label: 'Northern Rail Arc',
      mode: 'rail',
      region: 'europe',
      route: [
        { city: 'Amsterdam', latitude: 52.3676, longitude: 4.9041, offsetHours: 0 },
        { city: 'Berlin', latitude: 52.52, longitude: 13.405, offsetHours: 10 },
        { city: 'Vienna', latitude: 48.2082, longitude: 16.3738, offsetHours: 20 },
        { city: 'Milan', latitude: 45.4642, longitude: 9.19, offsetHours: 34 },
      ],
      start,
    }),
    buildTrack({
      id: 'eu-air',
      label: 'Mediterranean Air Bridge',
      mode: 'air',
      region: 'europe',
      route: [
        { city: 'Lisbon', latitude: 38.7223, longitude: -9.1393, offsetHours: 0 },
        { city: 'Paris', latitude: 48.8566, longitude: 2.3522, offsetHours: 6 },
        { city: 'Rome', latitude: 41.9028, longitude: 12.4964, offsetHours: 12 },
        { city: 'Athens', latitude: 37.9838, longitude: 23.7275, offsetHours: 18 },
      ],
      start,
    }),
    buildTrack({
      id: 'eu-sea',
      label: 'Baltic Sea Loop',
      mode: 'sea',
      region: 'europe',
      route: [
        { city: 'Copenhagen', latitude: 55.6761, longitude: 12.5683, offsetHours: 0 },
        { city: 'Stockholm', latitude: 59.3293, longitude: 18.0686, offsetHours: 10 },
        { city: 'Helsinki', latitude: 60.1699, longitude: 24.9384, offsetHours: 18 },
        { city: 'Tallinn', latitude: 59.437, longitude: 24.7536, offsetHours: 26 },
      ],
      start,
    }),
    buildTrack({
      id: 'na-rail',
      label: 'Lakes Rail Spine',
      mode: 'rail',
      region: 'north-america',
      route: [
        { city: 'Toronto', latitude: 43.6532, longitude: -79.3832, offsetHours: 0 },
        { city: 'Chicago', latitude: 41.8781, longitude: -87.6298, offsetHours: 12 },
        { city: 'Kansas City', latitude: 39.0997, longitude: -94.5786, offsetHours: 24 },
        { city: 'Denver', latitude: 39.7392, longitude: -104.9903, offsetHours: 38 },
      ],
      start,
    }),
    buildTrack({
      id: 'na-air',
      label: 'Atlantic Air Corridor',
      mode: 'air',
      region: 'north-america',
      route: [
        { city: 'Miami', latitude: 25.7617, longitude: -80.1918, offsetHours: 0 },
        { city: 'Atlanta', latitude: 33.749, longitude: -84.388, offsetHours: 5 },
        { city: 'New York', latitude: 40.7128, longitude: -74.006, offsetHours: 10 },
        { city: 'Montreal', latitude: 45.5017, longitude: -73.5673, offsetHours: 16 },
      ],
      start,
    }),
    buildTrack({
      id: 'na-sea',
      label: 'Pacific Coastal Shipping',
      mode: 'sea',
      region: 'north-america',
      route: [
        { city: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, offsetHours: 0 },
        { city: 'San Francisco', latitude: 37.7749, longitude: -122.4194, offsetHours: 8 },
        { city: 'Seattle', latitude: 47.6062, longitude: -122.3321, offsetHours: 16 },
        { city: 'Vancouver', latitude: 49.2827, longitude: -123.1207, offsetHours: 22 },
      ],
      start,
    }),
    buildTrack({
      id: 'asia-rail',
      label: 'East Asia Rail Weave',
      mode: 'rail',
      region: 'asia',
      route: [
        { city: 'Seoul', latitude: 37.5665, longitude: 126.978, offsetHours: 0 },
        { city: 'Busan', latitude: 35.1796, longitude: 129.0756, offsetHours: 6 },
        { city: 'Fukuoka', latitude: 33.5902, longitude: 130.4017, offsetHours: 12 },
        { city: 'Tokyo', latitude: 35.6762, longitude: 139.6503, offsetHours: 24 },
      ],
      start,
    }),
    buildTrack({
      id: 'asia-air',
      label: 'Southeast Air Bridge',
      mode: 'air',
      region: 'asia',
      route: [
        { city: 'Singapore', latitude: 1.3521, longitude: 103.8198, offsetHours: 0 },
        { city: 'Kuala Lumpur', latitude: 3.139, longitude: 101.6869, offsetHours: 4 },
        { city: 'Bangkok', latitude: 13.7563, longitude: 100.5018, offsetHours: 8 },
        { city: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, offsetHours: 13 },
      ],
      start,
    }),
    buildTrack({
      id: 'asia-sea',
      label: 'Straits Shipping Chain',
      mode: 'sea',
      region: 'asia',
      route: [
        { city: 'Jakarta', latitude: -6.2088, longitude: 106.8456, offsetHours: 0 },
        { city: 'Singapore', latitude: 1.3521, longitude: 103.8198, offsetHours: 8 },
        { city: 'Ho Chi Minh City', latitude: 10.8231, longitude: 106.6297, offsetHours: 18 },
        { city: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, offsetHours: 28 },
      ],
      start,
    }),
  ];
}

function buildTrack({
  id,
  label,
  mode,
  region,
  route,
  start,
}: {
  id: string;
  label: string;
  mode: DemoMode;
  region: DemoPointRegion;
  route: Array<{ city: string; latitude: number; longitude: number; offsetHours: number }>;
  start: number;
}) {
  const routeLabel = route.map((stop) => stop.city).join(' -> ');

  return {
    id,
    label,
    metrics: {
      cadence: route.length,
      throughput: 80 + route.length * 20,
    },
    properties: {
      mode,
      region,
      route: routeLabel,
    },
    frames: route.map((stop, index) => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: `${label} / ${stop.city}`,
      metrics: {
        throughput: 120 + index * 18,
        volume: 50 + index * 12,
      },
      properties: {
        mode,
        region,
        route: routeLabel,
      },
      time: start + stop.offsetHours * 60 * 60 * 1000,
    })),
  } satisfies TemporalMapTrack<DemoTrackProperties>;
}

function createDeterministicRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}
