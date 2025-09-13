import React, { useState, useRef, useLayoutEffect } from 'react';
import type { AnalysisParams } from '../types';
import { InfoIcon } from './Icons';

interface TuningPanelProps {
  currentParams: AnalysisParams;
  onParamsChange: (newParams: AnalysisParams) => void;
  isDisabled: boolean;
}

const ParameterInput: React.FC<{
  label: string;
  name: keyof AnalysisParams;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (name: keyof AnalysisParams, value: number) => void;
  isDisabled: boolean;
  tooltip: string;
}> = ({ label, name, value, min, max, step, onChange, isDisabled, tooltip }) => {
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(name, parseFloat(e.target.value));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Math.max(min, Math.min(max, parseFloat(e.target.value) || min));
    onChange(name, numValue);
  };

  const calculateTooltipPosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Estimate tooltip dimensions (you could measure this if needed)
    const tooltipWidth = 240; // approx width of w-60
    const tooltipHeight = 80; // approx height for 2-3 lines
    
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Default to top positioning
    let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
    let style: React.CSSProperties = {
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '100%',
      marginBottom: '8px'
    };

    // Check if top positioning would be clipped
    if (spaceAbove < tooltipHeight + 20) {
      // Not enough space above, try bottom
      if (spaceBelow >= tooltipHeight + 20) {
        position = 'bottom';
        style = {
          left: '50%',
          transform: 'translateX(-50%)',
          top: '100%',
          marginTop: '8px'
        };
      } else if (spaceRight >= tooltipWidth + 20) {
        // Not enough space above or below, try right
        position = 'right';
        style = {
          top: '50%',
          transform: 'translateY(-50%)',
          left: '100%',
          marginLeft: '8px'
        };
      } else if (spaceLeft >= tooltipWidth + 20) {
        // Try left side
        position = 'left';
        style = {
          top: '50%',
          transform: 'translateY(-50%)',
          right: '100%',
          marginRight: '8px'
        };
      } else {
        // Fallback: position at bottom but adjust horizontally if needed
        position = 'bottom';
        let left = '50%';
        // FIX: The 'right' variable was not declared. Declare it here to handle edge cases where the tooltip might go off-screen.
        let right: string | undefined;
        let transform = 'translateX(-50%)';
        
        // Check if tooltip would go off right edge
        const estimatedLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        if (estimatedLeft + tooltipWidth > viewportWidth - 10) {
          left = 'auto';
          right = '10px';
          transform = 'none';
        } 
        // Check if tooltip would go off left edge
        else if (estimatedLeft < 10) {
          left = '10px';
          transform = 'none';
        }

        style = {
          left,
          right,
          transform,
          top: '100%',
          marginTop: '8px'
        };
      }
    }

    setTooltipPosition(position);
    setTooltipStyle(style);
  };

  const handleMouseEnter = () => {
    calculateTooltipPosition();
  };

  // Recalculate on window resize
  useLayoutEffect(() => {
    const handleResize = () => {
      if (triggerRef.current?.matches(':hover')) {
        calculateTooltipPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tooltipClasses = {
    base: 'absolute bg-brand-bg border border-border-color text-text-secondary text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 shadow-lg w-60',
    top: '',
    bottom: '',
    left: '',
    right: ''
  };

  return (
    <div className="grid grid-cols-5 gap-2 items-center">
      <label htmlFor={name} className="col-span-2 text-sm text-text-secondary flex items-center gap-1.5 cursor-help">
        {label}
        <span 
          ref={triggerRef}
          onMouseEnter={handleMouseEnter}
          className="group relative flex items-center"
        >
          <InfoIcon className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
          <span 
            ref={tooltipRef}
            className={`${tooltipClasses.base} ${tooltipClasses[tooltipPosition]}`}
            style={tooltipStyle}
          >
            {tooltip}
          </span>
        </span>
      </label>
      <input
        type="range"
        id={name}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        disabled={isDisabled}
        className="col-span-2 w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-primary"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleNumberChange}
        disabled={isDisabled}
        className="col-span-1 w-full text-sm bg-brand-bg border border-border-color rounded-md p-1 text-center disabled:opacity-50 focus:ring-1 focus:ring-primary focus:border-primary"
      />
    </div>
  );
};

const TuningPanel: React.FC<TuningPanelProps> = ({ currentParams, onParamsChange, isDisabled }) => {
  const handleChange = (name: keyof AnalysisParams, value: number) => {
    onParamsChange({ ...currentParams, [name]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase text-text-secondary tracking-wider">Preprocessing & Thresholds</h3>
      <ParameterInput
        label="Blur Radius"
        name="blurRadius"
        value={currentParams.blurRadius}
        min={0} max={5} step={1}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="Blurs images before comparison to reduce noise. Higher values help ignore minor texture differences."
      />
      <ParameterInput
        label="Color Threshold"
        name="colorThreshold"
        value={currentParams.colorThreshold}
        min={10} max={150} step={5}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="How different two pixels' colors must be to be considered part of a change. Higher values detect more significant changes."
      />
      <h3 className="text-xs uppercase text-text-secondary tracking-wider pt-2">Region Filtering</h3>
      <ParameterInput
        label="Min Region Size"
        name="minRegionSize"
        value={currentParams.minRegionSize}
        min={50} max={1000} step={25}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="The minimum number of connected 'different' pixels to be considered a valid region. Filters out small noise."
      />
      <ParameterInput
        label="Merge Distance"
        name="mergeDistance"
        value={currentParams.mergeDistance}
        min={10} max={100} step={5}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="How close two distinct regions can be before they are merged into one. Helps group fragmented parts of a single change."
      />
      <ParameterInput
        label="Min Density"
        name="minDensity"
        value={Number(currentParams.minDensity.toFixed(2))}
        min={0.1} max={0.5} step={0.01}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="Filters out sparse, non-solid regions. A region must have this minimum percentage of 'different' pixels within its bounding box."
      />
      <ParameterInput
        label="Min Aspect Ratio"
        name="minAspectRatio"
        value={Number(currentParams.minAspectRatio.toFixed(2))}
        min={0.05} max={1.0} step={0.01}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="Filters out regions that are too tall and thin. Value is width/height."
      />
      <ParameterInput
        label="Max Aspect Ratio"
        name="maxAspectRatio"
        value={Number(currentParams.maxAspectRatio.toFixed(1))}
        min={1.0} max={20.0} step={0.1}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="Filters out regions that are too short and wide. Value is width/height."
      />
      <h3 className="text-xs uppercase text-text-secondary tracking-wider pt-2">Output Formatting</h3>
      <ParameterInput
        label="Max Region Size %"
        name="maxRegionSizePercent"
        value={Number(currentParams.maxRegionSizePercent.toFixed(2))}
        min={0.1} max={0.8} step={0.01}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="Maximum size of a region as percentage of image dimension. Prevents overly large differences."
      />
      <ParameterInput
        label="Circle Padding"
        name="circleRadiusMultiplier"
        value={Number(currentParams.circleRadiusMultiplier.toFixed(2))}
        min={1.0} max={2.0} step={0.05}
        onChange={handleChange}
        isDisabled={isDisabled}
        tooltip="How much extra padding to add around detected regions. Higher values create larger clickable circles."
      />
    </div>
  );
};

export default TuningPanel;