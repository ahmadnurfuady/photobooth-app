'use client';

import { useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
}

declare global {
    interface Window {
        turnstile: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    'error-callback'?: () => void;
                    'expired-callback'?: () => void;
                    theme?: 'light' | 'dark' | 'auto';
                    size?: 'normal' | 'compact';
                }
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
    onVerify,
    onError,
    onExpire,
    theme = 'auto',
    size = 'normal',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isRenderedRef = useRef(false);

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile || isRenderedRef.current) return;
        if (!siteKey) {
            console.error('[Turnstile] Site key not configured');
            return;
        }

        // Clear container first
        containerRef.current.innerHTML = '';

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            'error-callback': onError,
            'expired-callback': onExpire,
            theme,
            size,
        });

        isRenderedRef.current = true;
    }, [onVerify, onError, onExpire, theme, size, siteKey]);

    useEffect(() => {
        // If turnstile is already loaded, render immediately
        if (window.turnstile) {
            renderWidget();
        } else {
            // Set callback for when script loads
            window.onTurnstileLoad = renderWidget;
        }

        return () => {
            // Cleanup widget on unmount
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    // Widget might already be removed
                }
            }
            isRenderedRef.current = false;
        };
    }, [renderWidget]);

    if (!siteKey) {
        return (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">
                ⚠️ Turnstile site key not configured
            </div>
        );
    }

    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
                strategy="afterInteractive"
            />
            <div
                ref={containerRef}
                className="flex justify-center my-4"
            />
        </>
    );
};
