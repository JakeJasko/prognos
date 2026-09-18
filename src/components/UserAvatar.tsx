import React, { useState } from "react";

interface UserAvatarProps {
  avatar?: string | null;
  name?: string;
  size?: number | string;
  fontSize?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name = "User",
  size = 24,
  fontSize,
  className = "",
  style = {}
}) => {
  const [imgError, setImgError] = useState(false);

  const isUrl = Boolean(
    avatar &&
    (avatar.startsWith("http://") ||
     avatar.startsWith("https://") ||
     avatar.startsWith("/") ||
     avatar.startsWith("data:image/"))
  );

  const dimension = typeof size === "number" ? `${size}px` : size;

  if (isUrl && !imgError) {
    return (
      <img
        src={avatar!}
        alt={name}
        className={`user-avatar-img ${className}`}
        style={{
          width: dimension,
          height: dimension,
          minWidth: dimension,
          minHeight: dimension,
          ...style
        }}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  const emoji = avatar && !isUrl ? avatar : "🔭";
  const calculatedFontSize = fontSize || (typeof size === "number" ? `${Math.round(size * 0.75)}px` : "1.1rem");

  return (
    <span
      className={`user-avatar-emoji ${className}`}
      style={{
        fontSize: calculatedFontSize,
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
        ...style
      }}
      role="img"
      aria-label={name}
    >
      {emoji}
    </span>
  );
};
