import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Canvas } from "@react-three/fiber";

import {
  Center,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import {
  ArrowLeft,
  FileText,
  Maximize2,
  Plus,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";


const API = "";


// ============================================================
// HELPERS
// ============================================================

function clampIndex(value, size) {

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {

    return Math.floor(
      Math.max(0, size - 1) / 2
    );
  }

  return Math.max(
    0,
    Math.min(
      Math.floor(numeric),
      Math.max(0, size - 1)
    )
  );
}


function createTimepoint(number) {

  return {

    id:
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${number}`,

    name: `T${number}`,

    files: {

      t1n: null,
      t1c: null,
      t2w: null,
      flair: null,
    },
  };
}


// ============================================================
// SCREEN 1
// PROJECT SETUP
// ============================================================

function SetupScreen({ onOpen }) {

  const [patient, setPatient] = useState({

    name: "",
    id: "",
    age: "",
    sex: "",
  });


  const [timepoints, setTimepoints] =
    useState([
      createTimepoint(1),
    ]);


  const [processing, setProcessing] =
    useState(false);


  const [error, setError] =
    useState("");


  // ----------------------------------------------------------
  // Add timepoint
  // ----------------------------------------------------------

  function addTimepoint() {

    setTimepoints(
      (old) => [
        ...old,
        createTimepoint(
          old.length + 1
        ),
      ]
    );
  }


  // ----------------------------------------------------------
  // Update timepoint
  // ----------------------------------------------------------

  function updateTimepoint(
    id,
    patch
  ) {

    setTimepoints(
      (old) =>
        old.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item
        )
    );
  }


  // ----------------------------------------------------------
  // Update MRI file
  // ----------------------------------------------------------

  function updateFile(
    timepointId,
    modality,
    file
  ) {

    setTimepoints(
      (old) =>
        old.map(
          (item) => {

            if (
              item.id !== timepointId
            ) {
              return item;
            }

            return {

              ...item,

              files: {

                ...item.files,

                [modality]: file,
              },
            };
          }
        )
    );
  }


  // ----------------------------------------------------------
  // Remove timepoint
  // ----------------------------------------------------------

  function removeTimepoint(
    id
  ) {

    setTimepoints(
      (old) => {

        if (old.length <= 1) {
          return old;
        }

        return old.filter(
          (item) =>
            item.id !== id
        );
      }
    );
  }


  // ----------------------------------------------------------
  // Validate
  // ----------------------------------------------------------

  function validateUploads() {

    for (
      const point of timepoints
    ) {

      const modalities = [

        ["t1n", "T1n"],

        ["t1c", "T1c"],

        ["t2w", "T2w"],

        ["flair", "FLAIR"],
      ];


      for (
        const [
          key,
          label,
        ] of modalities
      ) {

        if (
          !point.files[key]
        ) {

          return (
            `Please upload the ${label} MRI ` +
            `for ${point.name}.`
          );
        }
      }
    }

    return null;
  }


  // ----------------------------------------------------------
  // Upload and process
  // ----------------------------------------------------------

  async function processScans() {

    setError("");

    const validationError =
      validateUploads();


    if (validationError) {

      setError(
        validationError
      );

      return;
    }


    setProcessing(true);


    try {

      const results = [];


      for (
        const point of timepoints
      ) {

        const form =
          new FormData();


        // IMPORTANT:
        // Backend expects:
        // files = four UploadFile objects
        //
        // The fourth file is point.files.flair.
        // NOT point.t2f.

        form.append(
          "files",
          point.files.t1n,
          point.files.t1n.name
        );

        form.append(
          "files",
          point.files.t1c,
          point.files.t1c.name
        );

        form.append(
          "files",
          point.files.t2w,
          point.files.t2w.name
        );

        form.append(
          "files",
          point.files.flair,
          point.files.flair.name
        );


        // Backend expects scan_id as Form(...)
        form.append(
          "scan_id",
          point.name
        );


        console.log(
          `Uploading ${point.name}`
        );

        console.log(
          "T1n:",
          point.files.t1n.name
        );

        console.log(
          "T1c:",
          point.files.t1c.name
        );

        console.log(
          "T2w:",
          point.files.t2w.name
        );

        console.log(
          "T2f/FLAIR:",
          point.files.flair.name
        );


        const response =
          await fetch(
            `${API}/api/upload-mri`,
            {
              method: "POST",
              body: form,
            }
          );


        let data;

        try {

          data =
            await response.json();

        } catch {

          throw new Error(
            `Backend returned HTTP ${response.status}`
          );
        }


        if (!response.ok) {

          throw new Error(
            data.detail ||
            `Failed to process ${point.name}`
          );
        }


        results.push({

          ...data,

          name:
            point.name,
        });
      }


      onOpen({

        scans: results,

        patient,
      });


    } catch (err) {

      console.error(
        err
      );

      setError(
        err.message ||
        "MRI processing failed."
      );


    } finally {

      setProcessing(
        false
      );
    }
  }


  // ==========================================================
  // MODALITY UPLOAD
  // ==========================================================

  function ModalityUpload({
    timepoint,
    modality,
    label,
  }) {

    const file =
      timepoint.files[
        modality
      ];


    return (

      <label
        className={
          "modality-upload " +
          (
            file
              ? "has-file"
              : ""
          )
        }
      >

        <div className="modality-upload-icon">

          <Upload
            size={16}
          />

        </div>


        <div className="modality-upload-text">

          <strong>
            {label}
          </strong>

          <span>

            {file
              ? file.name
              : "Choose .nii / .nii.gz"}

          </span>

        </div>


        <input
          type="file"
          accept=".nii,.nii.gz,.gz"
          onChange={
            (e) => {

              updateFile(
                timepoint.id,
                modality,
                e.target.files?.[0] ||
                  null
              );

              e.target.value = "";
            }
          }
        />

      </label>
    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="setup-page">

      <header className="setup-header">

        <div>

          <div className="brand">
            ONCOMORPH{" "}
            <span>4D</span>
          </div>

          <div className="subtitle">
            Longitudinal MRI Workstation
          </div>

        </div>

      </header>


      <main className="setup-content">

        <div className="eyebrow">
          PROJECT SETUP
        </div>


        <h1>
          Load longitudinal MRI scans
        </h1>


        <p className="setup-description">

          Upload the four MRI modalities
          for each timepoint. The backend
          generates the brain model, runs
          the trained tumour segmentation
          model, generates the tumour mask
          and tumour model, and prepares
          Matplotlib slice views.

        </p>


        {/* ====================================================
            PATIENT DETAILS
        ==================================================== */}

        <section className="patient-setup">

          <div className="section-title">
            PATIENT DETAILS
          </div>


          <div className="patient-grid">

            <input
              placeholder="Patient name"
              value={
                patient.name
              }
              onChange={
                (e) =>
                  setPatient({
                    ...patient,
                    name:
                      e.target.value,
                  })
              }
            />


            <input
              placeholder="Patient ID"
              value={
                patient.id
              }
              onChange={
                (e) =>
                  setPatient({
                    ...patient,
                    id:
                      e.target.value,
                  })
              }
            />


            <input
              placeholder="Age"
              value={
                patient.age
              }
              onChange={
                (e) =>
                  setPatient({
                    ...patient,
                    age:
                      e.target.value,
                  })
              }
            />


            <input
              placeholder="Sex"
              value={
                patient.sex
              }
              onChange={
                (e) =>
                  setPatient({
                    ...patient,
                    sex:
                      e.target.value,
                  })
              }
            />

          </div>


          <div className="patient-note">

            Optional — unspecified details
            will appear as NA in the report.

          </div>

        </section>


        {/* ====================================================
            TIMEPOINTS
        ==================================================== */}

        <div className="timepoint-list">

          {
            timepoints.map(
              (
                point,
                index
              ) => (

                <div
                  className="timepoint-card"
                  key={point.id}
                >

                  <div className="timepoint-card-header">

                    <div className="timepoint-label">

                      <span className="tp-dot" />

                      <input
                        value={
                          point.name
                        }
                        onChange={
                          (e) =>
                            updateTimepoint(
                              point.id,
                              {
                                name:
                                  e.target.value ||
                                  `T${index + 1}`,
                              }
                            )
                        }
                      />

                    </div>


                    {
                      timepoints.length >
                        1 && (

                        <button
                          className="icon-button"
                          onClick={() =>
                            removeTimepoint(
                              point.id
                            )
                          }
                          title="Remove timepoint"
                        >

                          <X
                            size={16}
                          />

                        </button>
                      )
                    }

                  </div>


                  {/* FOUR MRI FILES */}

                  <div className="modality-grid">

                    <ModalityUpload
                      timepoint={
                        point
                      }
                      modality="t1n"
                      label="T1n"
                    />


                    <ModalityUpload
                      timepoint={
                        point
                      }
                      modality="t1c"
                      label="T1c"
                    />


                    <ModalityUpload
                      timepoint={
                        point
                      }
                      modality="t2w"
                      label="T2w"
                    />


                    <ModalityUpload
                      timepoint={
                        point
                      }
                      modality="flair"
                      label="T2f / FLAIR"
                    />

                  </div>


                  <div className="modality-hint">

                    All four modalities are required
                    for tumour segmentation.

                  </div>

                </div>
              )
            )
          }

        </div>


        {/* ADD TIMEPOINT */}

        <button
          className="add-timepoint"
          onClick={
            addTimepoint
          }
        >

          <Plus
            size={16}
          />

          Add timepoint

        </button>


        {/* ERROR */}

        {
          error && (

            <div className="error-box">

              {error}

            </div>
          )
        }


        {/* PROCESS */}

        <button
          className="primary-button"
          disabled={
            processing
          }
          onClick={
            processScans
          }
        >

          {
            processing

              ? "PROCESSING MRI SCANS..."

              : "GENERATE MODELS & OPEN WORKSTATION"
          }

        </button>


        <div className="prototype-note">

          Prototype decision-support system.
          Model output is not clinically validated.

        </div>

      </main>

    </div>
  );
}


// ============================================================
// SMALL COMPONENTS
// ============================================================

function ToggleRow({
  label,
  active,
  onClick,
  red,
}) {

  return (

    <button
      className="toggle-row"
      onClick={onClick}
    >

      <span
        className={
          "status-dot " +
          (red ? "red" : "")
        }
      />

      <span>
        {label}
      </span>


      <span
        className={
          "toggle " +
          (
            active
              ? "on"
              : ""
          )
        }
      >

        <span />

      </span>

    </button>
  );
}


function InfoRow({
  label,
  value,
}) {

  return (

    <div className="info-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// ============================================================
// 3D GLB MODEL
// ============================================================

function GLBModel({ url, type, opacities }) {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) object.geometry.computeVertexNormals();

      const material = object.material?.clone?.() || new THREE.MeshStandardMaterial();

      if (type === "tumor") {
        material.roughness = 0.42;
        material.metalness = 0.02;

        const partName = object.name ? object.name.toLowerCase() : "";

        if (partName.includes("edema")) {
          material.transparent = opacities.edema < 1;
          material.opacity = opacities.edema;
          material.depthWrite = opacities.edema === 1;
        } else if (partName.includes("necrotic") || partName.includes("non-enhancing")) {
          material.transparent = opacities.cavity < 1;
          material.opacity = opacities.cavity;
          material.depthWrite = opacities.cavity === 1;
        } else {
          material.transparent = opacities.tumor < 1;
          material.opacity = opacities.tumor;
          material.depthWrite = opacities.tumor === 1;
        }
        object.renderOrder = 2;
      } else {
        // Brain material settings
        material.roughness = 0.55;
        material.metalness = 0.05;
        material.transparent = true;
        material.opacity = 0.28;
        material.depthWrite = false;
        object.renderOrder = 1;
      }
      
      material.side = THREE.DoubleSide;
      object.material = material;
    });

    return clone;
  // Re-run this block whenever an opacity slider changes
  }, [scene, type, opacities?.edema, opacities?.cavity, opacities?.tumor]);

  return <primitive object={clonedScene} />;
}


// ============================================================
// 3D VIEWER
// ============================================================

function ThreeDViewer({ scan, brainVisible, tumorVisible, opacities }) {
  const [resetKey, setResetKey] = useState(0);
  const cacheBust = useMemo(() => Date.now(), [scan.scan_id]);

  return (
    <div className="viewport">
      <div className="viewport-title">3D RECONSTRUCTION</div>
      
      <button
        className="small-icon three-reset"
        onClick={() => setResetKey((value) => value + 1)}
        title="Reset view"
      >
        <RotateCcw size={14} />
      </button>

      <Canvas
        key={resetKey}
        camera={{ position: [0, 0, 260], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#030507"]} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[100, 80, 100]} intensity={2.2} />
        <directionalLight position={[-80, -60, -80]} intensity={1.0} />

        <Suspense fallback={null}>
          <Center>
            {brainVisible && scan.brain_model_url && (
              <GLBModel url={`${API}${scan.brain_model_url}?v=${cacheBust}`} type="brain" />
            )}
            {tumorVisible && scan.tumor_model_url && (
              <GLBModel url={`${API}${scan.tumor_model_url}?v=${cacheBust}`} type="tumor" opacities={opacities} />
            )}
          </Center>
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={40} maxDistance={500} />
      </Canvas>

      <div className="legend">
        <span><i className="legend-brain" />Brain</span>
        <span><i className="legend-tumor" />Tumour region</span>
      </div>
    </div>
  );
}


// ============================================================
// MATPLOTLIB MRI VIEW
// ============================================================

function MRIViewport({
  scan,
  plane,
  title,
  showMask,
  onFullscreen,
}) {

  // ----------------------------------------------------------
  // Determine axis size
  // ----------------------------------------------------------

  const dimensions =
    scan?.dimensions || {
      x: 1,
      y: 1,
      z: 1,
    };


  const axisSize =
    plane === "axial"

      ? Number(
          dimensions.z
        )

      : plane === "coronal"

      ? Number(
          dimensions.y
        )

      : Number(
          dimensions.x
        );


  const safeAxisSize =
    Number.isFinite(
      axisSize
    ) &&
    axisSize > 0

      ? axisSize

      : 1;


  const [
    sliceIndex,
    setSliceIndex,
  ] = useState(
    Math.floor(
      (
        safeAxisSize - 1
      ) / 2
    )
  );


  // ----------------------------------------------------------
  // Reset when scan changes
  // ----------------------------------------------------------

  useEffect(
    () => {

      setSliceIndex(
        Math.floor(
          (
            safeAxisSize - 1
          ) / 2
        )
      );

    },
    [
      scan?.scan_id,
      scan?.name,
      plane,
      safeAxisSize,
    ]
  );


  const safeIndex =
    clampIndex(
      sliceIndex,
      safeAxisSize
    );


  // ----------------------------------------------------------
  // URL
  // ----------------------------------------------------------

  const imageUrl =
    `${API}/api/slice/` +
    `${encodeURIComponent(
      scan.scan_id
    )}/` +
    `${plane}/` +
    `${safeIndex}` +
    `?show_mask=${showMask}&v=${Date.now()}`;


  return (

    <div className="viewport">

      <div className="viewport-title">

        {title}

      </div>


      <div className="slice-number">

        {
          safeIndex + 1
        }

        {" / "}

        {
          safeAxisSize
        }

      </div>


      <img
        key={
          imageUrl
        }
        className="mri-image"
        src={
          imageUrl
        }
        alt={
          `${title} MRI`
        }
        onError={
          (e) => {

            console.error(
              "Slice loading failed:",
              imageUrl
            );

            e.currentTarget.style.opacity =
              "0.2";
          }
        }
      />


      <div className="slice-controls">

        <input
          type="range"
          min="0"
          max={
            Math.max(
              0,
              safeAxisSize - 1
            )
          }
          value={
            safeIndex
          }
          onChange={
            (e) =>
              setSliceIndex(
                Number(
                  e.target.value
                )
              )
          }
        />

      </div>


      <button
        className="fullscreen-button"
        onClick={
          onFullscreen
        }
      >

        <Maximize2
          size={14}
        />

      </button>

    </div>
  );
}


// ============================================================
// FULLSCREEN SLICE
// ============================================================

function FullscreenView({
  type,
  scan,
  showMask,
  onClose,
}) {

  return (

    <div className="fullscreen-overlay">

      <button
        className="close-fullscreen"
        onClick={
          onClose
        }
      >

        <X
          size={20}
        />

      </button>


      <MRIViewport
        title={
          type.toUpperCase()
        }
        plane={
          type
        }
        scan={
          scan
        }
        showMask={
          showMask
        }
        onFullscreen={
          onClose
        }
      />

    </div>
  );
}


// ============================================================
// REPORT
// ============================================================

// ============================================================
// ENHANCED CLINICAL REPORT
// ============================================================

function Report({ data, onClose }) {
  const { patient, scans } = data;

  const baseline = scans[0] || {};
  const latest = scans[scans.length - 1] || {};

  const getVol = (s, key = "tumor_volume_ml") => Number(s?.[key] || s?.measurements?.[key] || 0);
  const getCentroid = (s) => s?.measurements?.centroid_voxel || s?.centroid_voxel || null;

  const baselineTotal = getVol(baseline, "tumor_volume_ml");
  const latestTotal = getVol(latest, "tumor_volume_ml");
  const latestCore = getVol(latest, "core_volume_ml");
  const latestEdema = getVol(latest, "edema_volume_ml");

  // Determine if the backend model output includes sub-compartments
  const hasSubcompartments = scans.some((s) => getVol(s, "edema_volume_ml") > 0);

  // Cumulative change from baseline
  let totalDeltaPct = 0;
  if (baselineTotal > 0) {
    totalDeltaPct = ((latestTotal - baselineTotal) / baselineTotal) * 100;
  }

  // RANO 2.0 Volumetric Evaluation
  let ranoStatus = "Stable Disease (SD)";
  let ranoColor = "#45c7e9";
  if (latestTotal === 0 && baselineTotal > 0) {
    ranoStatus = "Complete Response (CR)";
    ranoColor = "#4ade80";
  } else if (totalDeltaPct <= -65) {
    ranoStatus = "Partial Response (PR)";
    ranoColor = "#4ade80";
  } else if (totalDeltaPct >= 40) {
    ranoStatus = "Progressive Disease (PD)";
    ranoColor = "#ff4d4d";
  }

  // Multi-point SVG Line Graph Coordinates
  const graphWidth = 540;
  const graphHeight = 140;
  const padding = 35;

  const maxVol = Math.max(
    ...scans.map((s) => Math.max(getVol(s, "tumor_volume_ml"), getVol(s, "core_volume_ml"), getVol(s, "edema_volume_ml"))),
    1
  );

  const getX = (index) =>
    scans.length === 1 ? graphWidth / 2 : padding + (index * (graphWidth - padding * 2)) / (scans.length - 1);
  const getY = (val) => graphHeight - padding - (val / maxVol) * (graphHeight - padding * 2);

  const totalPoints = scans.map((s, i) => `${getX(i)},${getY(getVol(s, "tumor_volume_ml"))}`).join(" ");
  const corePoints = scans.map((s, i) => `${getX(i)},${getY(getVol(s, "core_volume_ml"))}`).join(" ");
  const edemaPoints = scans.map((s, i) => `${getX(i)},${getY(getVol(s, "edema_volume_ml"))}`).join(" ");

  return (
    <div className="report-overlay">
      <div className="report report-wide">
        
        <div className="report-header">
          <div>
            <div className="eyebrow">CLINICAL REPORT</div>
            <h2>OncoMorph 4D · Longitudinal Volumetric Summary</h2>
          </div>
          <div className="report-actions" style={{ display: 'flex', gap: '10px' }}>
            <button className="report-button" onClick={() => window.print()}>Save as PDF</button>
            <button className="icon-button" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="report-grid">
          <InfoRow label="PATIENT NAME" value={patient?.name?.trim() || "NA"} />
          <InfoRow label="PATIENT ID" value={patient?.id?.trim() || "NA"} />
          <InfoRow label="AGE" value={patient?.age?.trim() || "NA"} />
          <InfoRow label="SEX" value={patient?.sex?.trim() || "NA"} />
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="report-kpi-grid">
          <div className="kpi-card">
            <span className="kpi-title">LATEST TOTAL LESION</span>
            <div className="kpi-value">{latestTotal.toFixed(2)} <small>mL</small></div>
            <span className={`kpi-badge ${totalDeltaPct <= 0 ? "good" : "bad"}`}>
              {totalDeltaPct >= 0 ? "+" : ""}{totalDeltaPct.toFixed(1)}% vs baseline
            </span>
          </div>
          
          {hasSubcompartments && (
            <>
              <div className="kpi-card">
                <span className="kpi-title">TUMOR CORE</span>
                <div className="kpi-value core-color">{latestCore.toFixed(2)} <small>mL</small></div>
                <span className="kpi-sub">Enhancing + necrotic</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-title">PERITUMORAL EDEMA</span>
                <div className="kpi-value edema-color">{latestEdema.toFixed(2)} <small>mL</small></div>
                <span className="kpi-sub">FLAIR signal abnormality</span>
              </div>
            </>
          )}
          
          <div className="kpi-card">
            <span className="kpi-title">RANO 2.0 CRITERIA</span>
            <div className="kpi-value" style={{ color: ranoColor, fontSize: "15px" }}>{ranoStatus}</div>
            <span className="kpi-sub">Baseline vs Latest</span>
          </div>
        </div>

        {/* MULTI-LINE SVG GRAPH */}
        <div className="report-block">
          <div className="report-block-header">
            <div className="report-label">VOLUMETRIC TRAJECTORY OVER TIME</div>
            <div className="graph-legend">
              <span className="legend-item"><i className="legend-total" /> Total Abnormal</span>
              {hasSubcompartments && (
                <>
                  <span className="legend-item"><i className="legend-core" /> Core</span>
                  <span className="legend-item"><i className="legend-edema" /> Edema</span>
                </>
              )}
            </div>
          </div>

          <div className="svg-container">
            <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="trend-svg">
              <line x1={padding} y1={graphHeight - padding} x2={graphWidth - padding} y2={graphHeight - padding} stroke="#1f2c37" strokeWidth="1" />
              <line x1={padding} y1={padding} x2={graphWidth - padding} y2={padding} stroke="#1f2c37" strokeDasharray="3,3" strokeWidth="1" />

              {scans.length > 1 && (
                <>
                  <polyline fill="none" stroke="#ff4d4d" strokeWidth="2.5" points={totalPoints} />
                  {hasSubcompartments && (
                    <>
                      <polyline fill="none" stroke="#f2994a" strokeWidth="2" strokeDasharray="4,3" points={corePoints} />
                      <polyline fill="none" stroke="#f2c94c" strokeWidth="2" strokeDasharray="2,2" points={edemaPoints} />
                    </>
                  )}
                </>
              )}

              {scans.map((scan, i) => {
                const total = getVol(scan, "tumor_volume_ml");
                const cx = getX(i);
                const cy = getY(total);
                return (
                  <g key={scan.scan_id || i}>
                    <circle cx={cx} cy={cy} r="4" fill="#ff4d4d" stroke="#070b0f" strokeWidth="2" />
                    <text x={cx} y={graphHeight - 12} fill="#7e909e" fontSize="10" textAnchor="middle">
                      {scan.name || `T${i + 1}`}
                    </text>
                    <text x={cx} y={cy - 8} fill="#cbd5df" fontSize="9" fontWeight="bold" textAnchor="middle">
                      {total.toFixed(1)} mL
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* LONGITUDINAL MEASUREMENTS TABLE */}
        <div className="report-block">
          <div className="report-label">DETAILED TIMEPOINT BREAKDOWN</div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Timepoint</th>
                <th>Total Vol</th>
                {hasSubcompartments && <th>Core</th>}
                {hasSubcompartments && <th>Edema</th>}
                <th>Interval Δ</th>
                <th>Cumulative Δ</th>
                <th>Centroid (Voxel)</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan, i) => {
                const total = getVol(scan, "tumor_volume_ml");
                const core = getVol(scan, "core_volume_ml");
                const edema = getVol(scan, "edema_volume_ml");
                const centroid = getCentroid(scan);

                const prevTotal = i > 0 ? getVol(scans[i - 1], "tumor_volume_ml") : null;
                const intervalDelta = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;
                const cumDelta = baselineTotal > 0 ? ((total - baselineTotal) / baselineTotal) * 100 : 0;

                return (
                  <tr key={scan.scan_id || i}>
                    <td><strong>{scan.name || `T${i + 1}`}</strong></td>
                    <td>{total.toFixed(2)} mL</td>
                    {hasSubcompartments && <td>{core.toFixed(2)} mL</td>}
                    {hasSubcompartments && <td>{edema.toFixed(2)} mL</td>}
                    <td>
                      {intervalDelta === null ? "—" : (
                        <span className={intervalDelta <= 0 ? "delta-good" : "delta-bad"}>
                          {intervalDelta >= 0 ? "+" : ""}{intervalDelta.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={cumDelta <= 0 ? "delta-good" : "delta-bad"}>
                        {cumDelta >= 0 ? "+" : ""}{cumDelta.toFixed(1)}%
                      </span>
                    </td>
                    <td className="mono-text">
                      {centroid ? `[${centroid.map((v) => Math.round(v)).join(", ")}]` : "NA"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="prototype-note">
          RANO 2.0 Volumetric Decision-Support Criteria: Progressive Disease (PD) is defined as $\ge 40\%$ increase in volume. Partial Response (PR) is defined as $\ge 65\%$ reduction in volume. All segmentations require clinician review.
        </div>
      </div>
    </div>
  );
}


// ============================================================
// WORKSTATION
// ============================================================

function Workstation({ scans, patient, onBack, onReport }) {
  const [selected, setSelected] = useState(0);
  const [tumorVisible, setTumorVisible] = useState(true);
  const [brainVisible, setBrainVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(null);

  // New states for the sliders
  const [edemaOpacity, setEdemaOpacity] = useState(0.15);
  const [cavityOpacity, setCavityOpacity] = useState(0.45);
  const [tumorOpacity, setTumorOpacity] = useState(1.0);

  const scan = scans[selected];


  if (!scan) {

    return (

      <div className="app-shell">

        <div className="error-box">

          No processed scans available.

        </div>

      </div>
    );
  }


  return (

    <div className="app-shell">

      {/* ====================================================
          TOP BAR
      ==================================================== */}

      <header className="topbar">

        <button
          className="back-button"
          onClick={
            onBack
          }
        >

          <ArrowLeft
            size={18}
          />

        </button>


        <div className="brand">

          ONCOMORPH{" "}
          <span>4D</span>

        </div>


        <div className="top-divider" />


        <div className="top-title">

          Longitudinal MRI Workstation

        </div>


        <button
          className="report-button"
          onClick={() =>
            onReport({
              patient,
              scans,
              current: scan,
            })
          }
        >

          <FileText
            size={15}
          />

          Clinical Report

        </button>

      </header>


      {/* ====================================================
          TIMELINE
      ==================================================== */}

      <div className="timeline">

        <div className="timeline-title">

          TIMEPOINTS

        </div>


        {
          scans.map(
            (
              item,
              index
            ) => (

              <button
                key={
                  item.scan_id ||
                  item.name ||
                  index
                }
                className={
                  "timepoint-tab " +
                  (
                    index === selected
                      ? "active"
                      : ""
                  )
                }
                onClick={() =>
                  setSelected(
                    index
                  )
                }
              >

                <span className="tp-dot" />


                <div>

                  <strong>

                    {
                      item.name ||
                      `T${index + 1}`
                    }

                  </strong>


                  <small>

                    Scan{" "}
                    {index + 1}

                  </small>

                </div>

              </button>
            )
          )
        }

      </div>


      {/* ====================================================
          WORKSPACE
      ==================================================== */}

      <div className="workspace">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <section className="side-section">

            <div className="section-title">
              PATIENT
            </div>


            <InfoRow
              label="NAME"
              value={
                patient?.name?.trim() ||
                "NA"
              }
            />


            <InfoRow
              label="ID"
              value={
                patient?.id?.trim() ||
                "NA"
              }
            />


            <InfoRow
              label="AGE"
              value={
                patient?.age?.trim() ||
                "NA"
              }
            />


            <InfoRow
              label="SEX"
              value={
                patient?.sex?.trim() ||
                "NA"
              }
            />

          </section>

          <section className="side-section">
            <div className="section-title">OPACITY CONTROLS</div>
            
            <div className="slider-row">
              <label>Enhancing Tumour (Red)</label>
              <input type="range" min="0" max="1" step="0.05" value={tumorOpacity} onChange={(e) => setTumorOpacity(parseFloat(e.target.value))} />
            </div>
            
            <div className="slider-row">
              <label>Necrotic Cavity (Blue)</label>
              <input type="range" min="0" max="1" step="0.05" value={cavityOpacity} onChange={(e) => setCavityOpacity(parseFloat(e.target.value))} />
            </div>

            <div className="slider-row">
              <label>Edema (Yellow)</label>
              <input type="range" min="0" max="1" step="0.05" value={edemaOpacity} onChange={(e) => setEdemaOpacity(parseFloat(e.target.value))} />
            </div>
          </section>


          {/* SEGMENTATION */}

          <section className="side-section">

            <div className="section-title">
              SEGMENTATION
            </div>


            <ToggleRow
              label="Tumour"
              active={
                tumorVisible
              }
              red
              onClick={() =>
                setTumorVisible(
                  (value) =>
                    !value
                )
              }
            />


            <ToggleRow
              label="Brain"
              active={
                brainVisible
              }
              onClick={() =>
                setBrainVisible(
                  (value) =>
                    !value
                )
              }
            />

          </section>


          {/* CURRENT SCAN */}

          <section className="side-section">

            <div className="section-title">
              CURRENT SCAN
            </div>


            <InfoRow
              label="TIMEPOINT"
              value={
                scan.name ||
                "NA"
              }
            />


            <InfoRow
              label="DIMENSIONS"
              value={
                scan.dimensions

                  ? `${scan.dimensions.x} × ` +
                    `${scan.dimensions.y} × ` +
                    `${scan.dimensions.z}`

                  : "NA"
              }
            />


            <InfoRow
              label="TUMOUR VOXELS"
              value={
                scan.tumour_voxels ??
                "NA"
              }
            />

          </section>


          <div className="prototype-note side-note">

            Model output is for demonstration
            and is not clinically validated.

          </div>

        </aside>


        {/* ==================================================
            MAIN VIEW GRID
        ================================================== */}

        <main className="view-grid">

          <MRIViewport
            title="AXIAL"
            plane="axial"
            scan={scan}
            showMask={
              tumorVisible
            }
            onFullscreen={() =>
              setFullscreen(
                "axial"
              )
            }
          />


          <MRIViewport
            title="CORONAL"
            plane="coronal"
            scan={scan}
            showMask={
              tumorVisible
            }
            onFullscreen={() =>
              setFullscreen(
                "coronal"
              )
            }
          />


          <MRIViewport
            title="SAGITTAL"
            plane="sagittal"
            scan={scan}
            showMask={
              tumorVisible
            }
            onFullscreen={() =>
              setFullscreen(
                "sagittal"
              )
            }
          />


          <ThreeDViewer
            scan={scan}
            brainVisible={brainVisible}
            tumorVisible={tumorVisible}
            opacities={{ edema: edemaOpacity, cavity: cavityOpacity, tumor: tumorOpacity }}
          />
          
        </main>

      </div>


      {/* FULLSCREEN */}

      {
        fullscreen && (

          <FullscreenView
            type={
              fullscreen
            }
            scan={
              scan
            }
            showMask={
              tumorVisible
            }
            onClose={() =>
              setFullscreen(
                null
              )
            }
          />

        )
      }

    </div>
  );
}


// ============================================================
// ROOT APP
// ============================================================

export default function App() {

  const [
    screen,
    setScreen,
  ] = useState(
    "setup"
  );


  const [
    project,
    setProject,
  ] = useState(null);


  const [
    report,
    setReport,
  ] = useState(null);


  // ----------------------------------------------------------
  // Setup
  // ----------------------------------------------------------

  if (
    screen === "setup"
  ) {

    return (

      <SetupScreen
        onOpen={
          (data) => {

            setProject(
              data
            );

            setScreen(
              "workstation"
            );
          }
        }
      />

    );
  }


  // ----------------------------------------------------------
  // Workstation
  // ----------------------------------------------------------

  if (
    !project
  ) {

    return null;
  }


  return (

    <>

      <Workstation
        scans={
          project.scans
        }
        patient={
          project.patient
        }
        onBack={() =>
          setScreen(
            "setup"
          )
        }
        onReport={
          setReport
        }
      />


      {
        report && (

          <Report
            data={
              report
            }
            onClose={() =>
              setReport(
                null
              )
            }
          />

        )
      }

    </>
  );
}
