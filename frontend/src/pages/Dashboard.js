import React, { useEffect, useState, useMemo } from 'react';
import { Box, Grid, Card, CardContent, Typography, Avatar, CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Tooltip } from '@mui/material';
import { Assignment, AssignmentTurnedIn, Folder, Layers, Timeline, RocketLaunch } from '@mui/icons-material';
import { Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import ModuleService from '../api/services/module.service';
import ReleaseService from '../api/services/release.service';
import SprintService from '../api/services/sprint.service';
import TaskService from '../api/services/task.service';
import dayjs from 'dayjs';
import ProjectService from '../api/services/project.service';
import ActivityService from '../api/services/activity.service';
import { useAuth } from '../contexts/AuthContext';

const RED = '#FA2B4D';
const RELEASE_STATUS_COLORS = {
  'Chưa bắt đầu': '#bdbdbd',
  'Đang chuẩn bị': '#1976d2',
  'Hoàn thành': '#43a047',
};

function StatCard({ icon, label, value, color }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px #fa2b4d11', px: 1, py: 0.5, height: '100%', width: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, height: '100%' }}>
        <Avatar sx={{ bgcolor: color, width: 36, height: 36 }}>{React.cloneElement(icon, { fontSize: 'medium' })}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} color={color} sx={{ fontSize: 20, wordBreak: 'break-word', lineHeight: 1.2 }}>{value}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal', fontSize: 13, wordBreak: 'break-word', lineHeight: 1.2 }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// Custom Tooltip cho BarChart tiến độ bàn giao
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  // Tìm bar có value > 0
  const data = payload.map(p => ({ name: p.name, value: p.value, color: p.fill, dataKey: p.dataKey })).filter(p => p.value > 0);
  if (!data.length) return null;
  // Nếu là cột Hoàn thành (có nhiều trạng thái nghiệm thu)
  if (label === 'Hoàn thành') {
    return (
      <Box sx={{ bgcolor: '#fff', p: 2, borderRadius: 2, boxShadow: 2, minWidth: 180 }}>
        <Typography fontWeight={700} fontSize={16} mb={1}>Hoàn thành</Typography>
        {data.map((d, idx) => (
          <Box key={d.dataKey} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: d.color, borderRadius: '50%', mr: 1 }} />
            <Typography fontWeight={d.value > 0 ? 600 : 400} color={d.color} fontSize={14}>
              {d.name.replace('Hoàn thành - ', '')}: {d.value}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }
  // Các cột khác
  const d = data[0];
  return (
    <Box sx={{ bgcolor: '#fff', p: 2, borderRadius: 2, boxShadow: 2, minWidth: 140 }}>
      <Typography fontWeight={700} fontSize={16} mb={1}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 12, height: 12, bgcolor: d.color, borderRadius: '50%', mr: 1 }} />
        <Typography fontWeight={600} color={d.color} fontSize={14}>
          {d.name}: {d.value}
        </Typography>
      </Box>
    </Box>
  );
}

// Custom label cho số bên trong stack bar, căn giữa dọc và ngang, font đẹp
const renderStackLabel = props => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 5}
      textAnchor="middle"
      fontWeight={700}
      fontSize={16}
      fill="#fff"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {value}
    </text>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [releases, setReleases] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);

  
  useEffect(() => {
    async function fetchActivities() {
      try {
        const userActivity = await ActivityService.getUserActivity(15);
        setActivity(userActivity || []);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      }
    }
    fetchActivities();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const pj = await ProjectService.getAllProjects();
        const md = await ModuleService.getAllModules();
        const sp = await SprintService.getAllSprints();
        const rl = await ReleaseService.getAllReleases();
        const tk = await TaskService.getAllTasks();
        if (mounted) {
          setProjects(pj || []);
          setModules(md || []);
          setSprints(sp || []);
          setReleases(rl || []);
          setTasks(tk || []);
        }
      } catch (e) {}
      setLoading(false);
    }
    fetchData();
    return () => { mounted = false; };
  }, [user]);

  // Card Dự án: user là thành viên (theo members)
  const userObjectId = user?._id && user._id.toString();
  const myProjects = useMemo(
    () =>
      projects.filter(
        p =>
          Array.isArray(p.members) &&
          p.members.some(
            m => m.user && m.user._id && m.user._id.toString() === userObjectId
          )
      ),
    [projects, userObjectId]
  );
  // Card Module: user là owner
  const myModules = useMemo(
    () => modules.filter(
      m => m.owner && m.owner._id && m.owner._id.toString() === userObjectId
    ),
    [modules, userObjectId]
  );
  // Card Sprint: user là thành viên
  const mySprints = useMemo(
    () => sprints.filter(
      s => Array.isArray(s.members) && s.members.some(
        m => m.user && m.user._id && m.user._id.toString() === userObjectId
      )
    ),
    [sprints, userObjectId]
  );
  // Card Task: user là assignee hoặc reviewer
  const myTasks = useMemo(
    () => tasks.filter(
      t => (t.assignee && t.assignee._id && t.assignee._id.toString() === userObjectId) ||
           (t.reviewer && t.reviewer._id && t.reviewer._id.toString() === userObjectId)
    ),
    [tasks, userObjectId]
  );
  // Card Task chờ xử lý: assignee hoặc reviewer, status chưa làm/đang làm
  const taskPending = myTasks.filter(
    t => t.status === 'Chưa làm' || t.status === 'Đang làm'
  ).length;
  // Card Task chờ review: reviewer, status đã xong, reviewStatus Chưa
  const taskWaitingReview = tasks.filter(
    t => t.reviewer && t.reviewer._id && t.reviewer._id.toString() === userObjectId &&
         t.status === 'Đã xong' && t.reviewStatus === 'Chưa'
  ).length;
  // Card Task đã hoàn thành: assignee, status đã xong, reviewStatus Đạt
  const taskDone = tasks.filter(
    t => t.assignee && t.assignee._id && t.assignee._id.toString() === userObjectId &&
         t.status === 'Đã xong' && t.reviewStatus === 'Đạt'
  ).length;

  // Release liên quan user: owner module, fromUser, toUser, approver
  const myReleases = useMemo(
    () => releases.filter(
      r =>
        (r.fromUser && r.fromUser._id && r.fromUser._id.toString() === userObjectId) ||
        (r.toUser && r.toUser._id && r.toUser._id.toString() === userObjectId) ||
        (r.approver && r.approver._id && r.approver._id.toString() === userObjectId) ||
        (r.module && myModules.some(m => m._id === (r.module._id || r.module)))
    ),
    [releases, myModules, userObjectId]
  );
  // Chuẩn bị dữ liệu cho biểu đồ tiến độ bàn giao
  const acceptanceStatusList = ['Chưa', 'Đạt', 'Không đạt'];
  const completedReleases = myReleases.filter(r => r.status === 'Hoàn thành');
  const acceptanceCounts = {};
  acceptanceStatusList.forEach(acc => {
    acceptanceCounts[acc] = completedReleases.filter(r => r.acceptanceStatus === acc).length;
  });
  // Sửa lại dữ liệu cho BarChart: mỗi object đều có đủ các key để các cột căn giữa
  const chartData = [
    {
      name: 'Chưa bắt đầu',
      'Chưa bắt đầu': myReleases.filter(r => r.status === 'Chưa bắt đầu').length,
      'Đang chuẩn bị': 0,
      'Chưa': 0,
      'Đạt': 0,
      'Không đạt': 0,
    },
    {
      name: 'Đang chuẩn bị',
      'Chưa bắt đầu': 0,
      'Đang chuẩn bị': myReleases.filter(r => r.status === 'Đang chuẩn bị').length,
      'Chưa': 0,
      'Đạt': 0,
      'Không đạt': 0,
    },
    {
      name: 'Hoàn thành',
      'Chưa bắt đầu': 0,
      'Đang chuẩn bị': 0,
      'Chưa': acceptanceCounts['Chưa'],
      'Đạt': acceptanceCounts['Đạt'],
      'Không đạt': acceptanceCounts['Không đạt'],
    }
  ];
  const ACCEPTANCE_COLORS = {
    'Chưa': '#bdbdbd',
    'Đạt': '#43a047',
    'Không đạt': '#d32f2f',
  };
  // Biểu đồ tiến độ bàn giao (release) chỉ cho release liên quan user

  // Biểu đồ trạng thái task

  // Timeline lịch bàn giao (release/sprint/task sắp đến hạn)
  const timelineData = useMemo(() => {
    const now = dayjs();
    const thirtyDaysFromNow = now.add(30, 'days');
    let items = [];

    // Lọc project của user sắp hết hạn trong 30 ngày tới
    myProjects.forEach(p => {
      const endDate = dayjs(p.endDate);
      if (p.endDate && endDate.isAfter(now) && endDate.isBefore(thirtyDaysFromNow)) {
        items.push({
          id: `project-${p._id}`,
          type: 'Dự án',
          name: p.name,
          date: p.endDate,
        });
      }
    });

    // Lọc release của user sắp hết hạn trong 30 ngày tới, chưa hoàn thành và nghiệm thu đạt
    myReleases.forEach(r => {
      const isDone = r.status === 'Hoàn thành' && r.acceptanceStatus === 'Đạt';
      const endDate = dayjs(r.endDate);
      if (r.endDate && endDate.isAfter(now) && endDate.isBefore(thirtyDaysFromNow) && !isDone) {
        items.push({
          id: `release-${r._id}`,
          type: 'Release',
          name: r.version,
          date: r.endDate,
        });
      }
    });

    // Lọc task của user sắp hết hạn sprint trong 30 ngày tới, chưa hoàn thành và review đạt
    myTasks.forEach(t => {
      const isDone = t.status === 'Đã xong' && t.reviewStatus === 'Đạt';
      const sprint = sprints.find(s => s._id === (t.sprint?._id || t.sprint));
      if (sprint && sprint.endDate) {
        const endDate = dayjs(sprint.endDate);
        if (endDate.isAfter(now) && endDate.isBefore(thirtyDaysFromNow) && !isDone) {
          items.push({
            id: `task-${t._id}`,
            type: 'Task',
            name: t.name,
            date: sprint.endDate,
          });
        }
      }
    });
    // Sắp xếp theo ngày đến hạn gần nhất
    return items.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [myProjects, myReleases, myTasks, sprints]);

  // Các mục đã quá hạn
  const overdueItemsData = useMemo(() => {
    const now = dayjs();
    let items = [];
    // Lọc project của user đã quá hạn
    myProjects.forEach(p => {
        const endDate = dayjs(p.endDate);
        const isDone = p.status === 'Hoàn thành' || p.status === 'Đã bàn giao';
        if (p.endDate && endDate.isBefore(now) && !isDone) {
            items.push({
                id: `project-${p._id}`,
                type: 'Dự án',
                name: p.name,
                date: p.endDate,
            });
        }
    });
    // Lọc release của user đã quá hạn
    myReleases.forEach(r => {
      const isDone = r.status === 'Hoàn thành' && r.acceptanceStatus === 'Đạt';
      const endDate = dayjs(r.endDate);
      if (r.endDate && endDate.isBefore(now) && !isDone) {
        items.push({
          id: `release-${r._id}`,
          type: 'Release',
          name: r.version,
          date: r.endDate,
        });
      }
    });
    // Lọc task của user đã quá hạn sprint
    myTasks.forEach(t => {
      const isDone = t.status === 'Đã xong' && t.reviewStatus === 'Đạt';
      const sprint = sprints.find(s => s._id === (t.sprint?._id || t.sprint));
      if (sprint && sprint.endDate) {
        const endDate = dayjs(sprint.endDate);
        if (endDate.isBefore(now) && !isDone) {
          items.push({
            id: `task-${t._id}`,
            type: 'Task',
            name: t.name,
            date: sprint.endDate,
          });
        }
      }
    });
    // Sắp xếp theo ngày quá hạn lâu nhất lên đầu
    return items.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [myProjects, myReleases, myTasks, sprints]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="error" size={60} />
      </Box>
    );
  }

  const totalCompleted = acceptanceCounts['Chưa'] + acceptanceCounts['Đạt'] + acceptanceCounts['Không đạt'];

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, background: '#f6f6f6', minHeight: '100vh' }}>
      <Grid container spacing={3} mb={2} alignItems="stretch">
        <Grid item xs={6} sm={4} md={2} sx={{ display: 'flex', width: '100%' }}>
          <StatCard icon={<Folder />} label="Dự án" value={myProjects.length} color={RED} />
        </Grid>
        <Grid item xs={6} sm={4} md={2} sx={{ display: 'flex', width: '100%' }}>
          <StatCard icon={<Layers />} label="Module" value={myModules.length} color="#f57c00" />
        </Grid>
        <Grid item xs={6} sm={4} md={2} sx={{ display: 'flex', width: '100%' }}>
          <StatCard icon={<Timeline />} label="Sprint" value={mySprints.length} color="#43a047" />
        </Grid>
        <Grid item xs={6} sm={4} md={2} sx={{ display: 'flex', width: '100%' }}>
          <StatCard icon={<Assignment />} label="Task chờ xử lý" value={taskPending} color="#bdbdbd" />
        </Grid>
        <Grid item xs={6} sm={4} md={2} sx={{ display: 'flex', width: '100%' }}>
          <StatCard icon={<Assignment />} label="Task chờ review" value={taskWaitingReview} color="#1976d2" />
        </Grid>
        <Grid item xs={6} sm={4} md={2} sx={{ display: 'flex', width: '100%' }}>
          <StatCard icon={<AssignmentTurnedIn />} label="Task đã hoàn thành" value={taskDone} color="#43a047" />
        </Grid>
      </Grid>
      {/* Biểu đồ và Dòng hoạt động */}
      <Grid container spacing={3} mb={2}>
        {/* Biểu đồ tiến độ bàn giao (release) */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderRadius: 3, minHeight: 320, height: '100%' }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                color={RED}
                mb={1}
                align="center"
                sx={{ textAlign: 'center' }}
              >
                Tiến độ bàn giao
              </Typography>
              {chartData.every(d => Object.values(d).slice(1).every(v => v === 0)) ? (
                <Typography color="text.secondary" sx={{ mt: 6, textAlign: 'center' }}>
                  Không có release liên quan nào để hiển thị.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barCategoryGap={40} barGap={8} margin={{ left: 24, right: 24 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 16, fontWeight: 400 }} />
                    <YAxis allowDecimals={false} />
                    {/* Mỗi trạng thái là một Bar riêng biệt */}
                    <Bar
                      dataKey="Chưa bắt đầu"
                      stackId="all"
                      fill={RELEASE_STATUS_COLORS['Chưa bắt đầu']}
                      name="Chưa bắt đầu"
                      barSize={40}
                      isAnimationActive={false}
                      label={({ x, y, width, value, index }) =>
                        value > 0 && index === 0 ? (
                          <text x={x + width / 2} y={y - 8} textAnchor="middle" fontWeight={700} fontSize={15} fill="#222">{value}</text>
                        ) : null
                      }
                    />
                    <Bar
                      dataKey="Đang chuẩn bị"
                      stackId="all"
                      fill={RELEASE_STATUS_COLORS['Đang chuẩn bị']}
                      name="Đang chuẩn bị"
                      barSize={40}
                      isAnimationActive={false}
                      label={({ x, y, width, value, index }) =>
                        value > 0 && index === 1 ? (
                          <text x={x + width / 2} y={y - 8} textAnchor="middle" fontWeight={700} fontSize={15} fill="#222">{value}</text>
                        ) : null
                      }
                    />
                    {/* Stacked bar cho Hoàn thành */}
                    <Bar
                      dataKey="Chưa"
                      stackId="all"
                      fill={ACCEPTANCE_COLORS['Chưa']}
                      name="Hoàn thành - Chưa nghiệm thu"
                      barSize={40}
                      isAnimationActive={false}
                    >
                      <LabelList dataKey="Chưa" content={renderStackLabel} />
                    </Bar>
                    <Bar
                      dataKey="Đạt"
                      stackId="all"
                      fill={ACCEPTANCE_COLORS['Đạt']}
                      name="Hoàn thành - Đạt"
                      barSize={40}
                      isAnimationActive={false}
                    >
                      <LabelList dataKey="Đạt" content={renderStackLabel} />
                    </Bar>
                    <Bar
                      dataKey="Không đạt"
                      stackId="all"
                      fill={ACCEPTANCE_COLORS['Không đạt']}
                      name="Hoàn thành - Không đạt"
                      barSize={40}
                      isAnimationActive={false}
                      label={({ x, y, width, value, index }) =>
                        value > 0 && index === 2 ? (
                          <text x={x + width / 2} y={y - 8} textAnchor="middle" fontWeight={700} fontSize={15} fill="#222">{totalCompleted}</text>
                        ) : null
                      }
                    >
                      <LabelList dataKey="Không đạt" content={renderStackLabel} />
                    </Bar>
                    <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        {/* Dòng hoạt động gần nhất */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderRadius: 3, minHeight: 320, height: '100%' }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                color={RED}
                mb={1}
                align="center"
                sx={{ textAlign: 'center' }}
              >
                Dòng hoạt động gần nhất
              </Typography>
              {activity.length === 0 ? (
                <Typography color="text.secondary" sx={{ mt: 6, textAlign: 'center' }}>
                  Không có hoạt động nào gần đây.
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 240, overflowY: 'auto', p: 1 }}>
                  {activity.map((item) => (
                    <ListItem key={item._id} sx={{ '&:hover': { bgcolor: '#f5f5f5' }, borderRadius: 1.5, mb: 0.5 }}>
                      <ListItemAvatar>
                        <Tooltip title={item.entityType}>
                          <Avatar sx={{ bgcolor: '#fa2b4d22', color: RED, width: 34, height: 34 }}>
                            {item.entityType === 'Project' ? <Folder fontSize="small"/> :
                             item.entityType === 'Module' ? <Layers fontSize="small"/> :
                             item.entityType === 'Release' ? <RocketLaunch fontSize="small"/> :
                             item.entityType === 'Sprint' ? <Timeline fontSize="small"/> :
                             <Assignment fontSize="small"/>}
                          </Avatar>
                        </Tooltip>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" component="div">
                            <Box component="strong" sx={{ color: '#333' }}>{item.fromUser?.name || 'Ai đó'}</Box>
                            {' '}{item.description}
                          </Typography>
                        }
                        secondary={
                          <Tooltip title={new Date(item.timestamp).toLocaleString('vi-VN')}>
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(item.timestamp).fromNow()}
                            </Typography>
                          </Tooltip>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Timeline & Overdue Items */}
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={6} lg={6}>
          <Card sx={{ borderRadius: 3, minHeight: 320, height: '100%' }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                color={RED}
                mb={1}
                align="center"
                sx={{ textAlign: 'center' }}
              >
                Lịch sắp tới
              </Typography>
              {timelineData.length === 0 ? (
                <Typography color="text.secondary" sx={{ mt: 6, textAlign: 'center' }}>
                  Không có deadline nào sắp tới.
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 240, overflowY: 'auto', p: 1 }}>
                  {timelineData.map((item) => (
                    <ListItem key={item.id} sx={{ '&:hover': { bgcolor: '#f5f5f5' }, borderRadius: 1.5, mb: 0.5 }}>
                      <ListItemAvatar>
                        <Tooltip title={item.type}>
                          <Avatar sx={{ bgcolor: '#fa2b4d22', color: RED, width: 32, height: 32 }}>
                            {item.type === 'Dự án' ? <Folder fontSize="small"/> :
                             item.type === 'Release' ? <RocketLaunch fontSize="small"/> :
                             <Assignment fontSize="small"/>}
                          </Avatar>
                        </Tooltip>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" component="div">
                            <Box component="span" sx={{ color: '#333', fontWeight: 'bold' }}>{item.type}:</Box>
                            {' '}{item.name}
                          </Typography>
                        }
                        secondary={
                          <Tooltip title={new Date(item.date).toLocaleString('vi-VN')}>
                            <Typography variant="caption" color="text.secondary">
                              Hết hạn {dayjs(item.date).fromNow()}
                            </Typography>
                          </Tooltip>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        {/* Overdue Items */}
        <Grid item xs={12} md={6} lg={6}>
          <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid #d32f2f' }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                color="#d32f2f"
                mb={1}
                align="center"
                sx={{ textAlign: 'center' }}
              >
                Các mục đã quá hạn
              </Typography>
              {overdueItemsData.length === 0 ? (
                <Typography color="text.secondary" sx={{ mt: 6, textAlign: 'center' }}>
                  Tuyệt vời! Không có mục nào bị trễ hạn.
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 240, overflowY: 'auto', p: 1 }}>
                  {overdueItemsData.map((item) => (
                    <ListItem key={item.id} sx={{ '&:hover': { bgcolor: '#ffebee' }, borderRadius: 1.5, mb: 0.5 }}>
                      <ListItemAvatar>
                        <Tooltip title={item.type}>
                          <Avatar sx={{ bgcolor: '#ffcdd2', color: '#d32f2f', width: 32, height: 32 }}>
                            {item.type === 'Dự án' ? <Folder fontSize="small"/> :
                             item.type === 'Release' ? <RocketLaunch fontSize="small"/> :
                             <Assignment fontSize="small"/>}
                          </Avatar>
                        </Tooltip>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" component="div">
                            <Box component="span" sx={{ color: '#333', fontWeight: 'bold' }}>{item.type}:</Box>
                            {' '}{item.name}
                          </Typography>
                        }
                        secondary={
                          <Tooltip title={new Date(item.date).toLocaleString('vi-VN')}>
                            <Typography variant="caption" color="#d32f2f" sx={{ fontWeight: 500 }}>
                              Quá hạn {dayjs(item.date).fromNow(true)}
                            </Typography>
                          </Tooltip>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/*
      // Các phần biểu đồ, activity, timeline đều comment lại
      */}
    </Box>
  );
} 