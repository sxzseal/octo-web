import React, { Component } from "react";
import {
    Button,
    Input,
    Select,
    Spin,
    Pagination,
    Toast,
    Banner,
    Tooltip,
} from "@douyinfe/semi-ui";
import { IconSearch, IconPlus, IconRefresh } from "@douyinfe/semi-icons";
import { WKApp } from "@octo/base";
import * as api from "../api/summaryApi";
import type {
    SummaryListItem,
    ListSummariesParams,
    TaskStatusType,
} from "../types/summary";
import { TaskStatus } from "../types/summary";
import { getStatusLabel } from "../utils/summaryHelpers";
import SummaryCard from "../components/SummaryCard";
import SummaryCreatePage from "./SummaryCreatePage";
import SummaryDetailPage from "./SummaryDetailPage";

interface SummaryListPageState {
    items: SummaryListItem[];
    total: number;
    page: number;
    pageSize: number;
    loading: boolean;
    error: string | null;
    statusFilter: TaskStatusType | undefined;
    keyword: string;
}

const statusOptions = [
    { value: "", label: "全部状态" },
    { value: TaskStatus.PENDING, label: getStatusLabel(TaskStatus.PENDING) },
    { value: TaskStatus.WAITING_CONFIRM, label: getStatusLabel(TaskStatus.WAITING_CONFIRM) },
    { value: TaskStatus.PROCESSING, label: getStatusLabel(TaskStatus.PROCESSING) },
    { value: TaskStatus.COMPLETED, label: getStatusLabel(TaskStatus.COMPLETED) },
    { value: TaskStatus.FAILED, label: getStatusLabel(TaskStatus.FAILED) },
    { value: TaskStatus.CANCELLED, label: getStatusLabel(TaskStatus.CANCELLED) },
];

export default class SummaryListPage extends Component<{}, SummaryListPageState> {
    state: SummaryListPageState = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        loading: false,
        error: null,
        statusFilter: undefined,
        keyword: "",
    };

    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private batchPollTimer: ReturnType<typeof setInterval> | null = null;
    private isBatchPolling = false;

    private handleStatusChange_ = () => this.loadData();
    private handleSpaceChanged_ = () => this.loadData();

    componentDidMount() {
        this.loadData();
        window.addEventListener("summary-status-change", this.handleStatusChange_);
        WKApp.mittBus.on("summary-space-changed", this.handleSpaceChanged_);
    }

    componentWillUnmount() {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.stopBatchPoll();
        window.removeEventListener("summary-status-change", this.handleStatusChange_);
        WKApp.mittBus.off("summary-space-changed", this.handleSpaceChanged_);
    }

    async loadData() {
        this.setState({ loading: true, error: null });
        try {
            const { page, pageSize, statusFilter, keyword } = this.state;
            const params: ListSummariesParams = {
                page,
                page_size: pageSize,
                status: statusFilter,
                keyword: keyword || undefined,
            };
            const resp = await api.listSummaries(params);
            this.setState({ items: resp.items, total: resp.total, loading: false }, () => {
                this.maybeStartBatchPoll();
            });
        } catch (err: any) {
            this.setState({ error: err.message || "加载失败", loading: false });
        }
    }

    handlePageChange = (page: number) => {
        this.setState({ page }, () => this.loadData());
    };

    private maybeStartBatchPoll() {
        const activeIds = this.state.items
            .filter(item =>
                item.status === TaskStatus.PENDING ||
                item.status === TaskStatus.WAITING_CONFIRM ||
                item.status === TaskStatus.PROCESSING
            )
            .map(item => item.task_id);

        if (activeIds.length === 0) {
            this.stopBatchPoll();
            return;
        }

        this.stopBatchPoll();
        this.batchPollTimer = setInterval(() => this.doBatchPoll(activeIds), 5000);
    }

    private async doBatchPoll(taskIds: number[]) {
        if (this.isBatchPolling) return;
        this.isBatchPolling = true;
        try {
            const updates = await api.batchStatus(taskIds);
            const updateMap = new Map(updates.map(u => [u.id, u]));
            let changed = false;
            const newItems = this.state.items.map(item => {
                const update = updateMap.get(item.task_id);
                if (update && update.status !== item.status) {
                    changed = true;
                    return { ...item, status: update.status };
                }
                return item;
            });
            if (changed) {
                this.setState({ items: newItems }, () => this.maybeStartBatchPoll());
                window.dispatchEvent(new CustomEvent("summary-status-change"));
            }
        } catch {
            // ignore
        } finally {
            this.isBatchPolling = false;
        }
    }

    private stopBatchPoll() {
        if (this.batchPollTimer) {
            clearInterval(this.batchPollTimer);
            this.batchPollTimer = null;
        }
    }

    handleStatusChange = (value: string | number) => {
        const statusFilter = value === "" ? undefined : (value as TaskStatusType);
        this.setState({ statusFilter, page: 1 }, () => this.loadData());
    };

    handleKeywordChange = (value: string) => {
        this.setState({ keyword: value });
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.setState({ page: 1 }, () => this.loadData());
        }, 400);
    };

    handleDelete = async (taskId: number) => {
        try {
            await api.deleteSummary(taskId);
            Toast.success("删除成功");
            WKApp.routeRight.popToRoot();
            WKApp.routeRight.push(
                <SummaryCreatePage onCreated={() => this.loadData()} />
            );
            this.loadData();
        } catch (err: any) {
            Toast.error(err.message || "删除失败");
        }
    };

    handleCardClick = (taskId: number) => {
        WKApp.routeRight.push(<SummaryDetailPage taskId={taskId} />);
    };

    handleRespond = async (taskId: number, action: "accept" | "reject") => {
        try {
            await api.respondToTask(taskId, action);
            Toast.success(action === "accept" ? "已同意" : "已拒绝");
            this.loadData();
        } catch (err: any) {
            Toast.error(err.message || "操作失败");
        }
    };

    handleCreate = () => {
        WKApp.routeRight.popToRoot();
        WKApp.routeRight.push(
            <SummaryCreatePage onCreated={() => this.loadData()} />
        );
    };

    render() {
        const { items, total, page, pageSize, loading, error, statusFilter, keyword } = this.state;

        return (
            <div className="summary-list-page">
                <div className="summary-list-header">
                    <h2 className="summary-list-title">智能总结</h2>
                    <Tooltip content="新建总结" position="bottom">
                        <Button
                            icon={<IconPlus />}
                            theme="borderless"
                            onClick={this.handleCreate}
                        />
                    </Tooltip>
                </div>

                <div className="summary-list-toolbar">
                    <Input
                        prefix={<IconSearch />}
                        placeholder="搜索总结..."
                        value={keyword}
                        onChange={this.handleKeywordChange}
                        showClear
                        style={{ width: 240 }}
                    />
                    <Select
                        value={statusFilter ?? ""}
                        onChange={this.handleStatusChange}
                        style={{ width: 140, marginLeft: 12 }}
                    >
                        {statusOptions.map((opt) => (
                            <Select.Option key={String(opt.value)} value={opt.value}>
                                {opt.label}
                            </Select.Option>
                        ))}
                    </Select>
                    <Button
                        icon={<IconRefresh />}
                        theme="borderless"
                        onClick={() => this.loadData()}
                        style={{ marginLeft: 4 }}
                    />
                </div>

                {error && (
                    <Banner
                        type="warning"
                        description={error}
                        closeIcon={null}
                        style={{ marginBottom: 16 }}
                        fullMode={false}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>网络连接异常，请检查网络后重试</span>
                            <Button size="small" onClick={() => this.loadData()}>重试</Button>
                        </div>
                    </Banner>
                )}

                {loading && (
                    <div className="summary-list-loading">
                        <Spin size="large" />
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="summary-list-empty">
                        <div className="summary-list-empty-icon">📄</div>
                        <div className="summary-list-empty-title">暂无总结记录</div>
                        <div className="summary-list-empty-desc">
                            快速生成群聊或个人工作总结，让 AI 帮你梳理重要信息
                        </div>
                        <Button theme="solid" onClick={this.handleCreate} style={{ marginTop: 16 }}>
                            创建第一份总结
                        </Button>
                    </div>
                )}

                {!loading && items.length > 0 && (
                    <>
                        <div className="summary-list-content">
                            {items.map((item) => (
                                <SummaryCard
                                    key={item.task_id}
                                    task={item}
                                    onClick={this.handleCardClick}
                                    onDelete={this.handleDelete}
                                    onRespond={this.handleRespond}
                                />
                            ))}
                        </div>
                        {total > pageSize && (
                            <div className="summary-list-pagination">
                                <Pagination
                                    currentPage={page}
                                    pageSize={pageSize}
                                    total={total}
                                    onPageChange={this.handlePageChange}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }
}
