import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import StudyHeader from "../StudyDetail/StudyHeader";
import StudyContent from "../StudyDetail/StudyContent";
import StudyRoomLink from "../StudyDetail/StudyRoomLink";
import CommentSection from "../StudyDetail/CommentSection";
import DeletePostModal from "../common/DeletePostModal";
import axiosInstance from "../../utils/axiosInstance";
import ToastNotification from "../common/ToastNotification";

const RecruitStudyDetailContainer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [study, setStudy] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isRecruited, setIsRecruited] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [studyRoom, setStudyRoom] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const studyId = id ? parseInt(id, 10) : null;

  // 현재 로그인된 사용자 정보를 가져오는 useEffect
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axiosInstance.get(
          `${process.env.REACT_APP_API_URL}/api/v1/users/whoami`
        );
        setCurrentUser(response.data.data);
      } catch (error: unknown) {
        console.error("사용자 정보를 가져오는 데 실패했습니다:", getErrorMessage(error));
      }
    };

    fetchCurrentUser();
  }, []);

  // 댓글 목록을 가져오는 함수
  const fetchComments = async (page = 0) => {
    try {
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/v1/posts/comments/${studyId}?page=${page}`
      );

      // 응답 데이터의 구조에 맞게 `content` 속성에서 댓글 목록을 추출
      const commentsData = response.data.data.content;

      if (Array.isArray(commentsData)) {
        const formattedComments = commentsData.map((comment: any) => ({
          id: comment.id,
          text: comment.content,
          author: comment.user.nickname,
          userId: comment.user.id, // 추가: 댓글 작성자의 ID
          createdAt: new Date(comment.createdAt).getTime(),
          // profileImage: comment.user.profileImage,
          profileImage: `${process.env.PUBLIC_URL}/assets/images/real_ian.png`,
        }));

        setComments(formattedComments);
      } else {
        console.error("댓글 데이터가 배열이 아닙니다:", commentsData);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        console.error("해당 게시글에 댓글이 없습니다.");
      } else {
        console.error("댓글을 불러오는 데 실패했습니다:", getErrorMessage(error));
      }
    }
  };

  // 게시글 상세 정보를 가져오는 useEffect
  useEffect(() => {
    const fetchStudyDetail = async () => {
      try {
        const response = await axiosInstance.get(
          `${process.env.REACT_APP_API_URL}/api/v1/posts/${studyId}`
        );
        const studyData = response.data.data;

        setStudy(studyData);
        setIsRecruited(studyData.recruited || false);

        if (studyData.room) {
          setStudyRoom({
            id: studyData.room.id,
            title: studyData.room.title,
            postCamEnabled: studyData.room.camEnabled,
            currentUsers: studyData.room.currentUsers,
            maxUsers: studyData.room.maxUsers,
            thumbnail: studyData.room.thumbnail,
          });
        }

        // 댓글 목록을 불러오기
        await fetchComments();
      } catch (error: unknown) {
        console.error("게시글을 불러오지 못했습니다:", getErrorMessage(error));
        alert("해당 게시글을 찾을 수 없습니다.");
        navigate("/recruit/list");
      }
    };

    fetchStudyDetail();
  }, [studyId, navigate]);

  // ToastNotification을 닫는 함수
  const handleCloseToast = () => {
    setShowToast(false);
  };

  // 댓글을 제출할 때 호출되는 함수
  const handleCommentSubmit = async (comment: string) => {
    if (!comment.trim()) {
      alert("댓글을 입력해주세요.");
      return;
    }

    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const requestBody = {
        postId: studyId,
        userId: currentUser.id,
        mentionId: null, // 멘션이 필요하지 않다면 null로 설정
        content: comment,
        createdAt: new Date().toISOString(),
      };

      const response = await axiosInstance.post(
        `${process.env.REACT_APP_API_URL}/api/v1/posts/comments`,
        requestBody
      );

      if (response.status === 201) {
        // 댓글 작성 후 댓글 목록을 다시 불러오기
        await fetchComments();
      } else {
        alert("댓글 작성에 실패했습니다.");
      }
    } catch (error: unknown) {
      console.error("댓글 작성 실패:", getErrorMessage(error));
      alert("댓글 작성에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  // 스터디룸으로 이동하는 함수
  const handleNavigateToRoom = () => {
    if (isRecruited) {
      navigate("/wait");
    }
  };

  // 게시글 수정 페이지로 이동하는 함수
  const handleEditPost = () => {
    navigate(`/recruit/update/${studyId}`);
  };

  // 게시글을 삭제하는 함수
  const handleDeletePost = async () => {
    try {
      await axiosInstance.delete(
        `${process.env.REACT_APP_API_URL}/api/v1/posts/${studyId}`
      );

      navigate("/recruit/list");
    } catch (error: unknown) {
      console.error("게시글 삭제 실패:", getErrorMessage(error));
      alert("게시글 삭제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  // 모집 완료 상태를 업데이트하는 함수
  const handleCompleteRecruitment = async () => {
    try {
      const requestBody = {
        userId: study.user.id,
        roomId: study.room?.id,
        title: study.title,
        content: study.content,
        type: study.type,
        isRecruited: false,
      };

      await axiosInstance.patch(
        `${process.env.REACT_APP_API_URL}/api/v1/posts/${studyId}`,
        requestBody
      );

      setIsRecruited(false);

      setStudy((prevStudy: any) => {
        const updatedStudy = { ...prevStudy, recruited: false };
        return updatedStudy;
      });

      setShowToast(true);
    } catch (error: unknown) {
      console.error("모집 상태 변경 실패:", getErrorMessage(error));
      alert("모집 상태 변경에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  if (!studyId) {
    return <div>유효한 ID를 제공해 주세요.</div>;
  }

  if (!study) {
    return <div>해당 게시글을 찾을 수 없습니다.</div>;
  }

  const isAuthor = study.user.id === currentUser?.id;

  return (
    <div className="container mx-auto mt-8 p-4 mt-[100px] w-[1000px] h-full">
      <StudyHeader
        study={study}
        isRecruited={isRecruited}
        isAuthor={isAuthor}
        onCompleteRecruitment={handleCompleteRecruitment}
        onEditPost={handleEditPost}
        onDeletePost={() => setShowDeleteModal(true)}
      />

      <StudyContent content={study.content} />

      <StudyRoomLink
        studyRoom={studyRoom}
        isRecruited={isRecruited}
        handleNavigateToRoom={handleNavigateToRoom}
      />

      <CommentSection
        comments={comments}
        isRecruited={isRecruited}
        onSubmitComment={handleCommentSubmit}
        currentUser={currentUser} // 현재 사용자 정보 전달
        postId={studyId}
      />

      {showDeleteModal && (
        <DeletePostModal
          title="게시글을 삭제하시겠습니까?"
          description="삭제된 게시글은 복구할 수 없습니다."
          onConfirm={handleDeletePost}
          onCancel={() => setShowDeleteModal(false)}
        />

      )}

      {showToast && (
        <ToastNotification message="변경 완료!" onClose={handleCloseToast} />
      )}
    </div>
  );
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return `Error: ${error.response.status} - ${error.response.data.message || error.message}`;
    }
    return error.message;
  } else if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default RecruitStudyDetailContainer;
