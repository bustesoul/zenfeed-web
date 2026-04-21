import { writable } from "svelte/store";
import {
    getProfile,
    type ProfileGlobal,
} from "$lib/utils/personalizationApi";

interface ProfileState {
    profile: ProfileGlobal | null;
    loading: boolean;
    initialized: boolean;
}

const initialState: ProfileState = {
    profile: null,
    loading: false,
    initialized: false,
};

function createProfileStateStore() {
    let currentState = initialState;
    let inflight: Promise<ProfileGlobal | null> | null = null;
    const { subscribe, set } = writable<ProfileState>(initialState);

    const setState = (next: ProfileState) => {
        currentState = next;
        set(next);
    };

    const refresh = async (): Promise<ProfileGlobal | null> => {
        if (inflight) {
            return inflight;
        }

        setState({ ...currentState, loading: true });
        inflight = getProfile()
            .then((profile) => {
                setState({
                    profile,
                    loading: false,
                    initialized: true,
                });
                return profile;
            })
            .catch((error) => {
                setState({
                    ...currentState,
                    loading: false,
                    initialized: true,
                });
                throw error;
            })
            .finally(() => {
                inflight = null;
            });

        return inflight;
    };

    return {
        subscribe,
        refresh,
        async ensureLoaded(): Promise<ProfileGlobal | null> {
            if (currentState.initialized) {
                return currentState.profile;
            }

            return refresh();
        },
        setProfile(profile: ProfileGlobal | null) {
            setState({
                profile,
                loading: false,
                initialized: true,
            });
        },
        clear() {
            setState({
                profile: null,
                loading: false,
                initialized: true,
            });
        },
    };
}

export const profileStateStore = createProfileStateStore();
