/**
 * ============================================================
 * production.res-validate.js
 * ------------------------------------------------------------
 * ZENTRALE RESSOURCEN-VALIDIERUNG (Gatekeeper)
 *
 * Aufgabe:
 * - Prüft, ob Ressourcen bei Produktion & Lieferung erlaubt sind
 * - Verhindert "stille Fehler" (falsche Keys, vergessene Registry)
 * - KEINE Gameplay-Logik, KEINE Umwandlungen, KEIN HUD
 *
 * Wichtig:
 * - meat & pelt sind erlaubt (Jagd)
 * - Umwandlung meat -> food passiert NACH Lieferung (woanders!)
 *
 * Version: v4.3a
 * ============================================================
 */

(function () {
    'use strict';

    // ------------------------------------------------------------
    // Interner State
    // ------------------------------------------------------------
    let RESOURCE_WHITELIST = null;

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

    function loadWhitelist() {
        if (RESOURCE_WHITELIST) return RESOURCE_WHITELIST;

        RESOURCE_WHITELIST = {};

        if (!window.Game || !Game.registry || !Game.registry.resources) {
            console.warn('[RES-VALIDATE] Registry resources not ready yet');
            return RESOURCE_WHITELIST;
        }

        Object.keys(Game.registry.resources).forEach(key => {
            RESOURCE_WHITELIST[key] = true;
        });

        return RESOURCE_WHITELIST;
    }

    function isValidAmount(amount) {
        return typeof amount === 'number' && isFinite(amount) && amount > 0;
    }

    function isValidTarget(target) {
        // Erlaubte Zieltypen (kann später erweitert werden)
        return (
            target === 'hq' ||
            target === 'warehouse' ||
            target === 'storage' ||
            target === 'market'
        );
    }

    function logBlocked(reason, payload) {
        console.warn('[RES-VALIDATE] BLOCKED:', reason, payload);
    }

    // ------------------------------------------------------------
    // Zentrale Prüfung
    // ------------------------------------------------------------
    function validate(payload) {
        if (!payload) {
            logBlocked('empty payload', payload);
            return false;
        }

        const { res, amount, target } = payload;

        const whitelist = loadWhitelist();

        if (!res || !whitelist[res]) {
            logBlocked(`unknown resource "${res}"`, payload);
            return false;
        }

        if (!isValidAmount(amount)) {
            logBlocked(`invalid amount "${amount}"`, payload);
            return false;
        }

        if (target && !isValidTarget(target)) {
            logBlocked(`invalid target "${target}"`, payload);
            return false;
        }

        return true;
    }

    // ------------------------------------------------------------
    // Event Hooks
    // ------------------------------------------------------------

    // Produktion fertig (z.B. Holzfäller, Fischer, Jäger)
    Game.events.on('cb:prod:output', payload => {
        if (!validate(payload)) {
            payload.__blocked = true;
        }
    });

    // Lieferung durch Träger ins HQ / Lager
    Game.events.on('cb:res:deliver', payload => {
        if (!validate(payload)) {
            payload.__blocked = true;
        }
    });

    // ------------------------------------------------------------
    // Debug API (optional)
    // ------------------------------------------------------------
    Game.debug = Game.debug || {};
    Game.debug.dumpResourceWhitelist = function () {
        return Object.keys(loadWhitelist());
    };

})();
