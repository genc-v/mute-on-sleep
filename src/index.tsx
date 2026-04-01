import { definePlugin, call } from "@decky/api";
import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import { useEffect, useState } from "react";
import { FaVolumeMute } from "react-icons/fa";

declare const SuspendResumeStore: {
  m_bSuspending: boolean;
};

function getSuspendObservable() {
  const sym = Object.getOwnPropertySymbols(SuspendResumeStore).find(
    (s) => s.toString() === "Symbol(mobx administration)"
  );
  if (!sym) return null;

  const admin = (SuspendResumeStore as any)[sym];
  return admin?.values_?.get("m_bSuspending") ?? null;
}

function MuteOnSleepPanel() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    call<[], boolean>("get_enabled").then(setEnabled);
  }, []);

  return (
    <PanelSection title="Mute On Sleep">
      <PanelSectionRow>
        <ToggleField
          label="Mute on sleep"
          description="When enabled, volume is set to 0% right before the Deck goes to sleep"
          checked={enabled}
          onChange={(val) => {
            setEnabled(val);
            call("set_enabled", val);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }}>
          Note: Because volume is muted right before sleep, other plugins that
          play sounds (e.g. animation changers) may also be silenced at that
          moment.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  let unregister: (() => void) | null = null;

  try {
    const observable = getSuspendObservable();

    if (observable) {
      unregister = observable.observe_((change: any) => {
        if (change.newValue) {
          console.log("[MuteOnSleep] suspending, muting audio");
          call("set_volume_zero");
        }
      });
    } else {
      console.warn("[MuteOnSleep] couldn't hook into SuspendResumeStore");
    }
  } catch (e) {
    console.error("[MuteOnSleep] failed to register suspend hook:", e);
  }

  return {
    name: "MuteOnSleep",
    content: <MuteOnSleepPanel />,
    icon: <FaVolumeMute />,
    onDismount() {
      unregister?.();
    },
  };
});
