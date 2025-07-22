import React from 'react';
import { List, ListItem, ListItemText, Typography, Box, Paper } from '@mui/material';

// Một component chung để hiển thị danh sách lịch sử
const HistoryList = ({ history, noHistoryMessage = "Chưa có dữ liệu lịch sử." }) => {
  if (!history || history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        {noHistoryMessage}
      </Typography>
    );
  }

  // Sắp xếp lịch sử theo thời gian mới nhất lên đầu
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 1, maxHeight: 400, overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
      <List dense>
        {sortedHistory.map((item, index) => (
          <ListItem 
            key={item._id || index} 
            divider={index < sortedHistory.length - 1}
            sx={{ 
              py: 1.5, 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              '&:hover': {
                backgroundColor: '#f0f0f0',
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
              <Typography variant="body2" fontWeight="bold" color="text.primary">
                {item.fromUser?.name || 'Hệ thống'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : ''}
              </Typography>
            </Box>
            <ListItemText
              primary={
                <Typography variant="body2" color="text.secondary">
                  {item.description || item.action}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default HistoryList; 