import React, { useEffect, useRef, useState } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { Script } from 'molstar/lib/mol-script/script';
import { StructureSelection } from 'molstar/lib/mol-model/structure/query';
import 'molstar/build/viewer/molstar.css';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';

interface MolstarViewerProps {
  uniprotAccession: string;
  cifUrl?: string;
  pdbUrl?: string;
  targetResidue?: number;
  wildTypeAa?: string;
  mutantAa?: string;
  isResidueValid: boolean;
  validationError?: string | null;
}

export const MolstarViewer: React.FC<MolstarViewerProps> = ({
  uniprotAccession,
  cifUrl,
  pdbUrl,
  targetResidue,
  wildTypeAa,
  mutantAa,
  isResidueValid,
  validationError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Mol* Plugin Context
  useEffect(() => {
    let isCancelled = false;

    async function initMolstar() {
      if (!containerRef.current || pluginRef.current) return;
      try {
        const spec = DefaultPluginUISpec();
        spec.layout = {
          initial: {
            isExpanded: false,
            showControls: false,
          },
        };

        const plugin = await createPluginUI({
          target: containerRef.current,
          render: renderReact18,
          spec,
        });

        if (!isCancelled) {
          pluginRef.current = plugin;
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error('Failed to initialize Mol* viewer:', err);
        if (!isCancelled) {
          setLoadError(err?.message || 'WebGL context initialization failed');
        }
      }
    }

    initMolstar();

    return () => {
      isCancelled = true;
      if (pluginRef.current) {
        try {
          pluginRef.current.dispose();
        } catch (e) {
          // ignore cleanup errors
        }
        pluginRef.current = null;
      }
    };
  }, []);

  // Load Structure when plugin is initialized and CIF URL is available
  useEffect(() => {
    let isCancelled = false;

    async function loadStructure() {
      const plugin = pluginRef.current;
      if (!plugin || !isInitialized || !cifUrl) return;

      setLoading(true);
      setLoadError(null);

      try {
        await plugin.clear();
        const data = await plugin.builders.data.download({
          url: cifUrl,
          isBinary: false,
        });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
        // Apply default preset which sets up 3D cartoon structure with AlphaFold pLDDT colors
        await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');

        // Highlight and focus target residue if validated
        if (targetResidue && isResidueValid && !isCancelled) {
          try {
            const structure = plugin.managers.structure.hierarchy.current.structures[0];
            if (structure && structure.cell.obj?.data) {
              const sel = Script.getStructureSelection(
                (Q) =>
                  Q.struct.generator.atomGroups({
                    'residue-test': Q.core.rel.eq([
                      Q.struct.atomProperty.macromolecular.auth_seq_id(),
                      targetResidue,
                    ]),
                  }),
                structure.cell.obj.data
              );
              const loci = StructureSelection.toLociWithSourceUnits(sel);
              plugin.managers.camera.focusLoci(loci);
              plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
            }
          } catch (selErr) {
            console.warn('Could not focus residue camera:', selErr);
          }
        }
      } catch (err: any) {
        console.error('Failed to load AlphaFold mmCIF:', err);
        if (!isCancelled) {
          setLoadError(`Failed to fetch or parse 3D coordinates from ${cifUrl}. The structure may not be accessible from this network environment.`);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadStructure();

    return () => {
      isCancelled = true;
    };
  }, [cifUrl, isInitialized, targetResidue, isResidueValid]);

  return (
    <div className="relative w-full h-[580px] bg-[#070C18] rounded-xl overflow-hidden border border-navy-800 flex flex-col">
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-navy-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-navy-750 text-xs font-mono text-slate-300 flex items-center gap-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>AF-{uniprotAccession}-F1-model_v4</span>
          {targetResidue && isResidueValid && (
            <span className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
              Residue #{targetResidue} {wildTypeAa ? `(${wildTypeAa}→${mutantAa})` : ''}
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {pdbUrl && (
            <a
              href={pdbUrl}
              download
              className="bg-navy-900/90 hover:bg-navy-800 text-slate-200 px-3 py-1.5 rounded-lg border border-navy-750 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg"
              title="Download PDB coordinate file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDB</span>
            </a>
          )}
          {cifUrl && (
            <a
              href={cifUrl}
              download
              className="bg-navy-900/90 hover:bg-navy-800 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-800/80 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg"
              title="Download mmCIF coordinate file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>mmCIF</span>
            </a>
          )}
        </div>
      </div>

      {/* Validation Warning when position is out of bounds */}
      {!isResidueValid && validationError && (
        <div className="absolute top-14 left-3 right-3 z-10 bg-amber-950/90 backdrop-blur-md border border-amber-700/80 text-amber-200 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-xl">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-navy-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <div className="space-y-1">
            <span className="text-sm font-semibold text-white block">Loading AlphaFold mmCIF Coordinates...</span>
            <span className="text-xs text-slate-400 font-mono block">Streaming from AlphaFold Protein Structure Database v4</span>
          </div>
        </div>
      )}

      {/* Error Fallback Overlay */}
      {loadError && (
        <div className="absolute inset-0 z-20 bg-navy-950/90 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <div className="max-w-md space-y-2">
            <h4 className="text-base font-bold text-white">Structure Visualization Offline</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{loadError}</p>
            <p className="text-[11px] text-slate-400 font-sans">
              You can still download the validated coordinate files or explore the model predictions and clinical evidence.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {cifUrl && (
              <a
                href={cifUrl}
                download
                className="px-4 py-2 bg-navy-800 hover:bg-navy-750 text-cyan-300 border border-cyan-800 text-xs font-mono rounded-lg transition-colors"
              >
                Download mmCIF File
              </a>
            )}
            {pdbUrl && (
              <a
                href={pdbUrl}
                download
                className="px-4 py-2 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 text-xs font-mono rounded-lg transition-colors"
              >
                Download PDB File
              </a>
            )}
          </div>
        </div>
      )}

      {/* Mol* WebGL Container */}
      <div ref={containerRef} className="w-full h-full relative" />
    </div>
  );
};
