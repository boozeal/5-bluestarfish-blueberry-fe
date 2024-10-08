import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useLoginedUserStore } from "../../store/store";
import { useNavigate, useLocation } from "react-router-dom"; // useNavigate, useLocation 가져오기

type AlarmModalProps = {
  closeModal: () => void;
};

const AlarmModal: React.FC<AlarmModalProps> = ({ closeModal }) => {
  const { userId } = useLoginedUserStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate(); // useNavigate 사용

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get(`${process.env.REACT_APP_API_URL}/api/v1/users/${userId}/notifications`);
      // 알림 데이터를 최신순으로 정렬
      setNotifications(response.data.data.reverse());
    } catch (error) {
      console.error("알림 데이터를 가져오는 데 실패했습니다:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // ESC 키로 모달 닫기 기능
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeModal]);

  // 알림 클릭 시 게시글로 이동
  const handleNotificationClick = (notification: any) => {
    if (notification.notiType === 'MENTION') {
      navigate(`/recruit/${notification.comment.post.id}#comment-${notification.comment.id}`); // 게시글로 이동하면서 해시를 통해 댓글로 이동
    }
  };

  const handleAcceptFriendRequest = async (notiId: number) => {
    try {
      if (notiId !== null) {
        // 1. 현재 사용자의 알림 리스트를 조회
        const response = await axiosInstance.get(
          `${process.env.REACT_APP_API_URL}/api/v1/users/${userId}/notifications`
        );

        const notifications = response.data.data;

        // 2. notiId에 해당하는 알림 찾기
        const notification = notifications.find(
          (noti: any) => noti.id === notiId && noti.notiType === "FRIEND" && noti.notiStatus === "PENDING"
        );

        if (!notification) {
          console.error("해당 알림을 찾을 수 없습니다.");
          return;
        }

        const senderId = notification.sender.id; // 친구 요청을 보낸 사용자 ID

        // 3. 친구 요청을 수락하는 API 요청
        const requestBody = {
          receiverId: senderId, // 요청을 보낸 사용자를 친구로 추가
          notiType: "FRIEND",
          notiStatus: "ACCEPTED",
          commentId: null,
          roomId: null
        };

        // 친구 요청 수락을 POST 요청으로 전송
        await axiosInstance.patch(`${process.env.REACT_APP_API_URL}/api/v1/users/${userId}/notifications/${notiId}`, requestBody);

        alert('친구 요청 수띾!');
        // setShowAddModal(false); // 모달 닫기
        // setShowAddFriendToast(true); // 토스트 메시지 표시
      }
    } catch (error) {
      console.error('친구 요청 수락 실패:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={closeModal}
    >
      <div
        className="absolute right-32 mt-[75px] w-[500px] h-[270px] bg-white text-black text-[8px] rounded-[20px] shadow-lg p-2 space-y-1 overflow-y-auto"
        onClick={handleModalClick}
      >
        <div className="flex items-center m-1 space-x-2 mt-2 mb-5">
          <img
            src={`${process.env.PUBLIC_URL}/assets/images/bell.png`}
            alt="알림 벨"
            aria-label="알림 벨 아이콘"
            className="h-[17px] rounded-full cursor-pointer"
          />
          <div className="text-[17px] font-bold">알림</div>
        </div>

        {isLoading ? (
          <div>로딩 중...</div>
        ) : notifications.length === 0 ? (
          <div>알림이 없습니다.</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex w-full h-[50px] items-center justify-between bg-[#ebeeff] rounded-[10px] p-2 cursor-pointer"
              onClick={() => handleNotificationClick(notification)} // 알림 클릭 시 게시글 이동
            >
              <div className="flex items-center space-x-1 w-full justify-between">
                {notification.notiType === 'MENTION' && (
                  <div className="flex items-center justify-start w-full">
                    {/* 왼쪽: 프로필 이미지 및 텍스트 */}
                    <img
                      src={`${process.env.PUBLIC_URL}/assets/images/noti-mention.png`}
                      alt="프로필 이미지"
                      aria-label="프로필 이미지"
                      className="h-[23px] rounded-full cursor-pointer mr-2"
                    />
                    <div className="flex flex-col">
                      <div className="font-semibold text-[13px]">{notification.sender.nickname}</div>
                      <div className="text-[12px]">{notification.comment.content}</div>
                    </div>
                  </div>
                )}

                {notification.notiType === 'FRIEND' && (
                  <>
                    {/* 왼쪽: 프로필 이미지 및 텍스트 */}
                    <div className="flex items-center">
                      <img
                        src={`${process.env.PUBLIC_URL}/assets/images/noti-friend.png`}
                        alt="프로필 이미지"
                        aria-label="프로필 이미지"
                        className="h-[23px] rounded-full cursor-pointer mr-2"
                      />
                      <div className="flex flex-col">
                        <div className="font-semibold text-[13px]">친구 요청</div>
                        <div className="text-[12px]">{notification.sender.nickname}님이 친구 요청을 보냈어요!</div>
                      </div>
                    </div>

                    {/* 오른쪽: 수락 및 거절 버튼 */}
                    <div className="ml-auto flex space-x-2">
                      <button
                        onClick={() => handleAcceptFriendRequest(notification.id)}
                        className="bg-green-500 text-white px-2 py-1 rounded-md text-xs hover:bg-green-600"
                      >
                        수락
                      </button>
                      <button
                        // onClick={() => handleRejectFriendRequest(notification.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded-md text-xs hover:bg-red-600"
                      >
                        거절
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlarmModal;
