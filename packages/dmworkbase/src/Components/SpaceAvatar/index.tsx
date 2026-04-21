import React from "react";
import "./index.css";

const AVATAR_COLORS = [
    "linear-gradient(135deg, #667eea, #764ba2)",
    "linear-gradient(135deg, #00B894, #00D4AA)",
    "linear-gradient(135deg, #4A85E6, #5C9AFF)",
    "linear-gradient(135deg, #E6930A, #FFAD33)",
    "linear-gradient(135deg, #36D1DC, #5B86E5)",
    "linear-gradient(135deg, #f093fb, #f5576c)",
];

function getGradient(name: string): string {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export type SpaceAvatarSize = "xs" | "sm" | "md" | "lg";

export interface SpaceAvatarProps {
    name: string;
    logo?: string;
    size?: SpaceAvatarSize;
    className?: string;
}

export default function SpaceAvatar({
    name,
    logo,
    size = "md",
    className,
}: SpaceAvatarProps) {
    const cls = ["wk-space-avatar", `wk-space-avatar--${size}`, className]
        .filter(Boolean)
        .join(" ");

    if (logo) {
        return <img className={cls} src={logo} alt={name} />;
    }

    return (
        <div
            className={cls}
            style={{ background: getGradient(name) }}
            aria-label={name}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
}
