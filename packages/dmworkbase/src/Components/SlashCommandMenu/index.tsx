import React, { Component } from "react";
import "./index.css";

export interface BotCommand {
    command: string;
    description: string;
}

interface SlashCommandMenuProps {
    commands: BotCommand[];
    filter: string;
    visible: boolean;
    activeIndex: number;
    onSelect: (command: BotCommand) => void;
}

export default class SlashCommandMenu extends Component<SlashCommandMenuProps> {
    private activeItemRef = React.createRef<HTMLDivElement>();

    componentDidUpdate(prevProps: SlashCommandMenuProps) {
        if (prevProps.activeIndex !== this.props.activeIndex && this.activeItemRef.current) {
            this.activeItemRef.current.scrollIntoView({ block: "nearest" });
        }
    }

    getFilteredCommands(): BotCommand[] {
        const { commands, filter } = this.props;
        if (!filter) return commands;
        const lower = filter.toLowerCase();
        return commands.filter(
            (cmd) =>
                cmd.command.toLowerCase().includes(lower) ||
                cmd.description.toLowerCase().includes(lower)
        );
    }

    render() {
        const { visible, activeIndex, onSelect } = this.props;
        if (!visible) return null;

        const filtered = this.getFilteredCommands();
        if (filtered.length === 0) {
            return (
                <div className="wk-slash-command-menu">
                    <div className="wk-slash-command-empty">无匹配的命令</div>
                </div>
            );
        }

        return (
            <div className="wk-slash-command-menu">
                <div className="wk-slash-command-menu-header">机器人命令</div>
                {filtered.map((cmd, index) => (
                    <div
                        key={cmd.command}
                        ref={index === activeIndex ? this.activeItemRef : undefined}
                        className={`wk-slash-command-item${index === activeIndex ? " wk-slash-command-item-active" : ""}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onSelect(cmd);
                        }}
                    >
                        <div className="wk-slash-command-name">/{cmd.command}</div>
                        <div className="wk-slash-command-desc">{cmd.description}</div>
                    </div>
                ))}
            </div>
        );
    }
}
