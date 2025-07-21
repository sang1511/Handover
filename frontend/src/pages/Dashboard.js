import React, { useEffect, useState, useMemo } from 'react';
import { Box, Grid, Card, CardContent, Typography, Avatar, CircularProgress, Divider, List, ListItem, ListItemAvatar, ListItemText, Chip, Tooltip } from '@mui/material';
import { Assignment, AssignmentTurnedIn, Folder, Layers, Timeline, Event, RocketLaunch, AccessTime, History } from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, LabelList } from 'recharts';
import ModuleService from '../api/services/module.service';
import ReleaseService from '../api/services/release.service';
import SprintService from '../api/services/sprint.service';
import TaskService from '../api/services/task.service';
import dayjs from 'dayjs';
import ProjectService from '../api/services/project.service';
import ActivityService from '../api/services/activity.service';
import { useAuth } from '../contexts/AuthContext';

const RED = '#FA2B4D';
const LIGHT_RED = '#FFF0F3';
const CARD_ICONS = [
  { icon: <Folder />, label: 'Dự án', color: RED },
  { icon: <Layers />, label: 'Module', color: '#f57c00' },
  { icon: <Timeline />, label: 'Sprint', color: '#43a047' },
  { icon: <Assignment />, label: 'Task chờ', color: '#bdbdbd' },
  { icon: <AssignmentTurnedIn />, label: 'Task hoàn thành', color: '#43a047' },
];
const TASK_STATUS_COLORS = {
  'Chưa làm': '#bdbdbd',
  'Đang làm': '#FA2B4D',
  'Đã xong': '#43a047',
};
const RELEASE_STATUS_COLORS = {
  'Chưa bắt đầu': '#bdbdbd',
  'Đang chuẩn bị': '#1976d2',
  'Hoàn thành': '#43a047',
};

function StatCard({ icon, label, value, color }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px #fa2b4d11', minWidth: 200 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{label}</Typography>
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
  const statusList = ['Chưa bắt đầu', 'Đang chuẩn bị', 'Hoàn thành'];
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
  const progressChartData = useMemo(() => {
    const statusMap = { 'Chưa bắt đầu': 0, 'Đang chuẩn bị': 0, 'Hoàn thành': 0 };
    myReleases.forEach(r => {
      if (statusMap[r.status] !== undefined) statusMap[r.status]++;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [myReleases]);

  // Biểu đồ trạng thái task
  const taskStatusChartData = useMemo(() => {
    const statusMap = { 'Chưa làm': 0, 'Đang làm': 0, 'Đã xong': 0 };
    tasks.forEach(t => {
      if (statusMap[t.status] !== undefined) statusMap[t.status]++;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Timeline lịch bàn giao (release/sprint/task sắp đến hạn)
  const timelineItems = useMemo(() => {
    const now = new Date();
    let items = [];
    releases.forEach(r => {
      if (r.endDate && new Date(r.endDate) >= now) {
        items.push({
          type: 'Release',
          name: r.version,
          date: r.endDate,
        });
      }
    });
    sprints.forEach(s => {
      if (s.endDate && new Date(s.endDate) >= now) {
        items.push({
          type: 'Sprint',
          name: s.name,
          date: s.endDate,
        });
      }
    });
    tasks.forEach(t => {
      if (t.status !== 'Đã xong' && t.sprint) {
        const sprint = sprints.find(s => s._id === t.sprint || s._id === t.sprint?._id);
        if (sprint && sprint.endDate && new Date(sprint.endDate) >= now) {
          items.push({
            type: 'Task',
            name: t.name,
            date: sprint.endDate,
          });
        }
      }
    });
    return items.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8);
  }, [releases, sprints, tasks]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="error" size={60} />
      </Box>
    );
  }

  const totalCompleted = acceptanceCounts['Chưa'] + acceptanceCounts['Đạt'] + acceptanceCounts['Không đạt'];

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, background: '#fff', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={900} color={RED} mb={2} letterSpacing={1}>
        Dashboard
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<Folder />} label="Dự án" value={myProjects.length} color={RED} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<Layers />} label="Module" value={myModules.length} color="#f57c00" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<Timeline />} label="Sprint" value={mySprints.length} color="#43a047" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<Assignment />} label="Task chờ xử lý" value={taskPending} color="#bdbdbd" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<Assignment />} label="Task chờ review" value={taskWaitingReview} color="#1976d2" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<AssignmentTurnedIn />} label="Task đã hoàn thành" value={taskDone} color="#43a047" />
        </Grid>
      </Grid>
      {/* Biểu đồ và Dòng hoạt động */}
      <Grid container spacing={2} mb={2} justifyContent="center">
        {/* Biểu đồ tiến độ bàn giao (release) */}
        <Grid item xs={12} md={8} lg={6}>
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
                    >
                      <LabelList dataKey="Chưa" content={renderStackLabel} />
                    </Bar>
                    <Bar
                      dataKey="Đạt"
                      stackId="all"
                      fill={ACCEPTANCE_COLORS['Đạt']}
                      name="Hoàn thành - Đạt"
                      barSize={40}
                    >
                      <LabelList dataKey="Đạt" content={renderStackLabel} />
                    </Bar>
                    <Bar
                      dataKey="Không đạt"
                      stackId="all"
                      fill={ACCEPTANCE_COLORS['Không đạt']}
                      name="Hoàn thành - Không đạt"
                      barSize={40}
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
        <Grid item xs={12} md={8} lg={6}>
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
                          <Avatar sx={{ bgcolor: '#fa2b4d22', color: RED, width: 36, height: 36 }}>
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
      {/*
      // Các phần biểu đồ, activity, timeline đều comment lại
      */}
    </Box>
  );
} 