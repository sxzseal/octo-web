import React from "react"
import "./index.css"

export type SidebarTab = 'group' | 'dm'

export interface SidebarTabBarProps {
    activeTab: SidebarTab
    groupUnread: number
    dmUnread: number
    onTabChange: (tab: SidebarTab) => void
}

const SidebarTabBar: React.FC<SidebarTabBarProps> = ({
    activeTab,
    groupUnread,
    dmUnread,
    onTabChange,
}) => {
    return (
        <div className="wk-sidebar-tabbar">
            <div className="wk-sidebar-tabbar__container">
                <button
                    className={`wk-sidebar-tabbar__btn ${activeTab === 'group' ? 'wk-sidebar-tabbar__btn--active' : ''}`}
                    onClick={() => onTabChange('group')}
                >
                    <span className="wk-sidebar-tabbar__label">群聊</span>
                    {groupUnread > 0 && (
                        <span className="wk-sidebar-tabbar__badge">
                            {groupUnread > 99 ? '99+' : groupUnread}
                        </span>
                    )}
                </button>
                <button
                    className={`wk-sidebar-tabbar__btn ${activeTab === 'dm' ? 'wk-sidebar-tabbar__btn--active' : ''}`}
                    onClick={() => onTabChange('dm')}
                >
                    <span className="wk-sidebar-tabbar__label">私聊</span>
                    {dmUnread > 0 && (
                        <span className="wk-sidebar-tabbar__badge">
                            {dmUnread > 99 ? '99+' : dmUnread}
                        </span>
                    )}
                </button>
            </div>
        </div>
    )
}

export default SidebarTabBar
