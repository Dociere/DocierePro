/**
 * PropertyPanel — Context-aware property editor for the right sidebar.
 * Dynamically renders input controls based on the selected component's
 * propertyDefinitions from componentRegistry.js.
 *
 * Translates user-friendly terms (margins, hex colors) into LaTeX units.
 */
import React, { useState } from "react";
import { TbX, TbPlus, TbMinus, TbTrash } from "react-icons/tb";
import { getComponentDef } from "../../utils/componentRegistry";
import { PAGE_SIZE_PRESETS } from "../../utils/layoutSchema";

// ==========================================
// INDIVIDUAL CONTROL RENDERERS
// ==========================================

const TextControl = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder || ""}
    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
  />
);

const TextareaControl = ({ value, onChange, placeholder }) => (
  <textarea
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder || ""}
    rows={4}
    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all resize-y font-mono"
  />
);

const NumberControl = ({ value, onChange, min, max, step }) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={() => onChange(Math.max(min || 0, (parseFloat(value) || 0) - (step || 1)))}
      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <TbMinus size={12} />
    </button>
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step || 1}
      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 text-center"
    />
    <button
      type="button"
      onClick={() => onChange(Math.min(max || 999, (parseFloat(value) || 0) + (step || 1)))}
      className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <TbPlus size={12} />
    </button>
  </div>
);

const ToggleControl = ({ value, onChange, label }) => (
  <label className="flex items-center justify-between cursor-pointer py-0.5">
    <span className="text-sm text-gray-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative ${
        value ? "bg-black" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  </label>
);

const SelectControl = ({ value, onChange, options }) => (
  <select
    value={value ?? ""}
    onChange={(e) => {
      const opt = options.find((o) => String(o.value) === e.target.value);
      onChange(opt ? opt.value : e.target.value);
    }}
    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
  >
    {options.map((opt) => (
      <option key={String(opt.value)} value={String(opt.value)}>
        {opt.label}
      </option>
    ))}
  </select>
);

const ListControl = ({ value, onChange }) => {
  const items = value || [];

  const addItem = () => onChange([...items, "New item"]);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx, val) =>
    onChange(items.map((item, i) => (i === idx ? val : item)));

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <span className="text-xs text-gray-400 min-w-[20px] text-right">{i + 1}.</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <button
            onClick={() => removeItem(i)}
            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
          >
            <TbTrash size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black font-medium py-1 transition-colors"
      >
        <TbPlus size={12} /> Add item
      </button>
    </div>
  );
};

// ==========================================
// GLOBAL TEMPLATE SETTINGS PANEL
// ==========================================

const GlobalSettingsPanel = ({ schema, onUpdateSettings }) => {
  const margins = schema.margins || {};

  const parseVal = (s) => parseFloat(s) || 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Template</h3>
        <p className="text-sm font-medium text-gray-900">{schema.templateName}</p>
        <p className="text-xs text-gray-400 capitalize">{schema.templateType} · {schema.documentClass}</p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Page Size</h3>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {Object.entries(PAGE_SIZE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() =>
                onUpdateSettings({
                  pageSize: { ...preset },
                })
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                schema.pageSize?.width === preset.width && schema.pageSize?.height === preset.height
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-gray-400">
            {schema.pageSize?.width} × {schema.pageSize?.height}
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Margins (mm)</h3>
        <div className="grid grid-cols-2 gap-2">
          {["top", "bottom", "left", "right"].map((side) => (
            <div key={side}>
              <span className="text-[10px] text-gray-400 uppercase">{side}</span>
              <input
                type="number"
                min="0"
                value={parseVal(margins[side])}
                onChange={(e) =>
                  onUpdateSettings({
                    margins: { ...margins, [side]: `${e.target.value}mm` },
                  })
                }
                className="w-full mt-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Layout Mode</h3>
        <div className="flex gap-1.5">
          {["flow", "absolute"].map((mode) => (
            <button
              key={mode}
              onClick={() => onUpdateSettings({ layoutMode: mode })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                schema.layoutMode === mode
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN PROPERTY PANEL
// ==========================================

const PropertyPanel = ({
  selectedComponent,
  schema,
  onUpdateProps,
  onDeleteComponent,
  onUpdateSettings,
}) => {
  if (!selectedComponent) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Template Settings</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <GlobalSettingsPanel schema={schema} onUpdateSettings={onUpdateSettings} />
        </div>
      </div>
    );
  }

  const compDef = getComponentDef(selectedComponent.type);
  if (!compDef) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Unknown component type: {selectedComponent.type}
      </div>
    );
  }

  const renderControl = (propDef) => {
    const currentValue = selectedComponent.props[propDef.key];
    const update = (val) => onUpdateProps(selectedComponent.id, { [propDef.key]: val });

    switch (propDef.type) {
      case "text":
        return <TextControl value={currentValue} onChange={update} placeholder={propDef.placeholder} />;
      case "textarea":
        return <TextareaControl value={currentValue} onChange={update} placeholder={propDef.placeholder} />;
      case "number":
        return (
          <NumberControl
            value={currentValue}
            onChange={update}
            min={propDef.min}
            max={propDef.max}
            step={propDef.step}
          />
        );
      case "toggle":
        return <ToggleControl value={currentValue} onChange={update} label={propDef.label} />;
      case "select":
        return <SelectControl value={currentValue} onChange={update} options={propDef.options || []} />;
      case "list":
        return <ListControl value={currentValue} onChange={update} />;
      default:
        return <TextControl value={currentValue} onChange={update} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{compDef.label}</h2>
          <p className="text-[10px] text-gray-400">{compDef.description}</p>
        </div>
        <button
          onClick={() => onDeleteComponent(selectedComponent.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete component"
        >
          <TbTrash size={16} />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {compDef.propertyDefinitions.map((propDef) => (
          <div key={propDef.key}>
            {propDef.type !== "toggle" && (
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {propDef.label}
              </label>
            )}
            {renderControl(propDef)}
          </div>
        ))}

        {compDef.propertyDefinitions.length === 0 && (
          <p className="text-xs text-gray-400 italic">This component has no configurable properties.</p>
        )}

        {/* Required packages info */}
        {compDef.requiredPackages.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Auto-included Packages
            </p>
            <div className="flex flex-wrap gap-1">
              {compDef.requiredPackages.map((pkg) => (
                <span
                  key={pkg}
                  className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-mono"
                >
                  {pkg}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;
