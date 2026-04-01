import asyncio
import json
import os
import pwd
import decky

SETTINGS_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")

# figure out who the deck user is from the homebrew install dir
_decky_home = os.environ.get("DECKY_HOME", "/home/deck/homebrew")
_deck_uid = os.stat(_decky_home).st_uid
_deck_user = pwd.getpwuid(_deck_uid).pw_name


def load_settings():
    try:
        with open(SETTINGS_PATH, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"enabled": True}


def save_settings(settings):
    os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f)


class Plugin:
    async def get_enabled(self):
        return load_settings().get("enabled", True)

    async def set_enabled(self, enabled):
        settings = load_settings()
        settings["enabled"] = enabled
        save_settings(settings)
        decky.logger.info(f"enabled: {enabled}")

    async def set_volume_zero(self):
        settings = load_settings()
        if not settings.get("enabled", True):
            return

        decky.logger.info("muting audio")
        xdg_runtime = f"/run/user/{_deck_uid}"

        mute_proc = await asyncio.create_subprocess_exec(
            "sudo", "-u", _deck_user, "env", f"XDG_RUNTIME_DIR={xdg_runtime}",
            "pactl", "set-sink-mute", "@DEFAULT_SINK@", "1",
            stderr=asyncio.subprocess.PIPE,
        )
        vol_proc = await asyncio.create_subprocess_exec(
            "sudo", "-u", _deck_user, "env", f"XDG_RUNTIME_DIR={xdg_runtime}",
            "pactl", "set-sink-volume", "@DEFAULT_SINK@", "0%",
            stderr=asyncio.subprocess.PIPE,
        )
        results = await asyncio.gather(mute_proc.communicate(), vol_proc.communicate())

        for i, (_, stderr) in enumerate(results):
            if stderr:
                decky.logger.error(f"pactl command {i} stderr: {stderr.decode()}")

    async def _main(self):
        decky.logger.info("MuteOnSleep loaded")

    async def _unload(self):
        decky.logger.info("MuteOnSleep unloaded")
