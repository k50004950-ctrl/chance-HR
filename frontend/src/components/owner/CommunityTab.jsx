import React from 'react';

/**
 * Community tab - extracted from OwnerDashboard
 * Props needed:
 * - communityLoading, communityPosts, openCommunityModal
 * - user, handleDeleteCommunityPost
 */
const CommunityTab = ({
  communityLoading,
  communityPosts,
  openCommunityModal,
  user,
  handleDeleteCommunityPost
}) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#374151' }}>💬 사업주 커뮤니티</h3>
        <button
          className="btn btn-primary"
          onClick={() => openCommunityModal('create')}
        >
          ✏️ 글 작성
        </button>
      </div>

      {communityLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
          로딩 중...
        </div>
      ) : communityPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
          작성된 게시글이 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>번호</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', width: '50%' }}>제목</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>작성자</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>조회수</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>댓글</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>추천</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>작성일</th>
                {user && <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>관리</th>}
              </tr>
            </thead>
            <tbody>
              {communityPosts.map((post, index) => (
                <tr
                  key={post.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => openCommunityModal('view', post)}
                >
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    {communityPosts.length - index}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>
                      {post.title}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    {post.author_name}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    👁️ {post.view_count || 0}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    💬 {post.comment_count || 0}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    👍 {post.like_count || 0}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    {new Date(post.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                  </td>
                  {user && (
                    <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {post.user_id === user.id && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openCommunityModal('edit', post);
                            }}
                          >
                            수정
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCommunityPost(post.id);
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CommunityTab;
