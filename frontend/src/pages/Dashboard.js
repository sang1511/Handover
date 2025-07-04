import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';
import { red } from '@mui/material/colors';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AuthService from '../api/services/auth.service';
import ProjectService from '../api/services/project.service';
import axiosInstance from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer as RechartsResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  'Chưa làm': '#FFCA28', // Amber 300
  'Đang làm': '#42A5F5', // Blue 400
  'Đã xong': '#66BB6A',  // Green 400
};

const StatCard = ({ icon, label, value, color }) => (
  <Paper
    elevation={3}
    sx={{
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderRadius: 3,
      minHeight: 120,
      background: '#fff',
      boxShadow: '0 2px 8px rgba(229,57,53,0.08)',
    }}
  >
    <Box sx={{ mb: 1, color: color || red[500] }}>{icon}</Box>
    <Typography variant="body2" sx={{ color: '#888', fontWeight: 500 }}>{label}</Typography>
    <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Paper>
);

const ProgressChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={180}>
    <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
      <XAxis dataKey="name" tick={{ fontSize: 13 }} />
      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
      <Tooltip formatter={v => `${v}%`} />
      <Bar dataKey="progress" fill={red[500]} radius={[8, 8, 0, 0]}>
        <LabelList dataKey="progress" position="top" formatter={v => `${v}%`} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={15}
      fontWeight={600}
      style={{ textShadow: '0 1px 2px #0006' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const TaskStatusChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={180}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        labelLine={false}
        label={renderCustomizedLabel}
      >
        {data.map((entry) => (
          <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name]} />
        ))}
      </Pie>
      <RechartsTooltip formatter={(value, name) => [value, name]} />
      <Legend iconSize={12} wrapperStyle={{ fontSize: '13px' }} />
    </PieChart>
  </ResponsiveContainer>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stat, setStat] = useState({
    projects: 0,
    activeSprints: 0,
    todoTasks: 0,
    doneTasks: 0,
  });
  const [progressData, setProgressData] = useState([]);
  const [taskStatusData, setTaskStatusData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 1. Lấy user hiện tại
        const user = await AuthService.getCurrentUser();
        if (!user || !user._id) throw new Error('Không xác định được user');
        // 2. Lấy danh sách project
        const projects = await ProjectService.getAllProjects();
        // 3. Lấy sprint cho từng project
        let activeSprints = 0;
        let todoTasks = 0;
        let inProgressTasks = 0;
        let doneTasks = 0;
        const progressArr = [];
        for (const project of projects) {
          const sprintsRes = await axiosInstance.get(`/sprints?projectId=${project._id}`);
          const sprints = sprintsRes.data || [];
          let userTasks = 0;
          let userDone = 0;
          for (const sprint of sprints) {
            // Sprint đang hoạt động
            if (sprint.status === 'Đang chạy' && sprint.members.some(m => m.user === user._id || m.user?._id === user._id)) {
              activeSprints++;
            }
            // Đếm task của user
            if (Array.isArray(sprint.tasks)) {
              for (const task of sprint.tasks) {
                if (task.assignee === user._id || task.assignee?._id === user._id) {
                  userTasks++;
                  if (task.status === 'Chưa làm') todoTasks++;
                  else if (task.status === 'Đang làm') inProgressTasks++;
                  else if (task.status === 'Đã xong') {
                    doneTasks++;
                    userDone++;
                  }
                }
              }
            }
          }
          progressArr.push({
            name: project.name.length > 16 ? project.name.slice(0, 15) + '…' : project.name,
            progress: userTasks > 0 ? Math.round((userDone / userTasks) * 100) : 0,
          });
        }
        setStat({
          projects: projects.length,
          activeSprints,
          todoTasks,
          doneTasks,
        });
        setProgressData(progressArr);
        setTaskStatusData([
          { name: 'Chưa làm', value: todoTasks },
          { name: 'Đang làm', value: inProgressTasks },
          { name: 'Đã xong', value: doneTasks },
        ].filter(d => d.value > 0)); // Chỉ hiển thị trạng thái có task
      } catch (err) {
        setStat({ projects: 0, activeSprints: 0, todoTasks: 0, doneTasks: 0 });
        setProgressData([]);
        setTaskStatusData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, background: '#fafbfc', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: red[600], mb: 3 }}>
        Dashboard
      </Typography>
      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AssignmentIcon sx={{ fontSize: 36 }} />} label="Dự án của tôi" value={loading ? '-' : stat.projects} color={red[500]} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ListAltIcon sx={{ fontSize: 36 }} />} label="Sprint hoạt động" value={loading ? '-' : stat.activeSprints} color={red[400]} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<HourglassEmptyIcon sx={{ fontSize: 36 }} />} label="Task chờ xử lý" value={loading ? '-' : stat.todoTasks} color={red[300]} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CheckCircleIcon sx={{ fontSize: 36 }} />} label="Task hoàn thành" value={loading ? '-' : stat.doneTasks} color={red[200]} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        {/* Progress Chart & Task Status Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3, minHeight: 260, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Biểu đồ tiến độ bàn giao
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
                Đang tải dữ liệu…
              </Box>
            ) : progressData.length === 0 ? (
              <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
                Không có dữ liệu
              </Box>
            ) : (
              <ProgressChart data={progressData} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, minHeight: 260, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Biểu đồ trạng thái task
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
                Đang tải dữ liệu…
              </Box>
            ) : taskStatusData.length === 0 ? (
              <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
                Không có task nào
              </Box>
            ) : (
              <TaskStatusChart data={taskStatusData} />
            )}
          </Paper>
        </Grid>
        {/* Recent Activity & Timeline */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 3, minHeight: 220 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Dòng hoạt động gần nhất (placeholder)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ color: '#bbb' }}>
              (Recent Activity sẽ hiển thị ở đây)
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 3, minHeight: 220 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Lịch bàn giao (Timeline) (placeholder)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ color: '#bbb' }}>
              (Timeline sẽ hiển thị ở đây)
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 