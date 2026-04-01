import { definePlugin, call } from "@decky/api";
import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
} from "@decky/ui";
import { useEffect, useState, FC } from "react";
import { FaVolumeMute } from "react-icons/fa";

declare const SuspendResumeStore: {
  m_bSuspending: boolean;
};

function getMobxObservable(store: any, property: string) {
  const adminSymbol = Object.getOwnPropertySymbols(store).find(
    (s) => s.toString() === "Symbol(mobx administration)"
  );
  if (adminSymbol) {
    const admin = store[adminSymbol];
    if (admin?.values_?.get(property)) {
      return admin.values_.get(property);
    }
  }
  return null;
}

const MuteOnWakePanel: FC = () => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    call<[], boolean>("get_enabled").then((val) => setEnabled(val));
  }, []);

  const onToggle = async (val: boolean) => {
    setEnabled(val);
    await call<[boolean], void>("set_enabled", val);
  };

  return (
    <PanelSection title="Mute On Wake">
      <PanelSectionRow>
        <ToggleField
          label="Mute before sleep"
          description="When enabled, volume is set to 0% right before the Deck goes to sleep"
          checked={enabled}
          onChange={onToggle}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }}>
          Note: Because volume is muted right before sleep, other plugins that play sounds (e.g. animation changers) may also be silenced at that moment.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default definePlugin(() => {
  let unregister: (() => void) | null = null;

  try {
    const suspendObservable = getMobxObservable(SuspendResumeStore, "m_bSuspending");

    if (suspendObservable) {
      unregister = suspendObservable.observe_((change: { newValue: boolean }) => {
        if (change.newValue) {
          console.log("[MuteOnWake] Suspend detected via MobX, muting...");
          call<[], void>("set_volume_zero");
        }
      });
      console.log("[MuteOnWake] Registered MobX suspend observer");
    } else {
      console.error("[MuteOnWake] Could not get SuspendResumeStore.m_bSuspending observable");
    }
  } catch (e) {
    console.error("[MuteOnWake] Failed to register suspend hook:", e);
  }

  return {
    name: "MuteOnWake",
    content: <MuteOnWakePanel />,
    icon: <FaVolumeMute />,
    onDismount: () => {
      unregister?.();
    },
  };
});
