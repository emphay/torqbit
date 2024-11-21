import { FC } from "react";
import styles from "./Courses.module.scss";
import Link from "next/link";
import { CourseCardSize, ICourseCard, ICourseInfo } from "@/types/landing/courses";
import { Tag } from "antd";

import { CourseType } from "@prisma/client";

const CourseCard: FC<ICourseCard> = ({
  thumbnail,
  title,
  description,
  link,
  cardClass,
  price,
  courseType,
  difficulty,
  duration,
  size,
}) => {
  return (
    <Link href={link} className={`${styles.courses__card} courses__card__${size} ${cardClass}`}>
      <img alt={title} aria-label={`icon for ${title.toLowerCase()}`} src={thumbnail} />
      <div>
        <div>
          <div>
            <Tag className={styles.tag_difficulty}>{difficulty}</Tag>
            <h4>{title}</h4>
            {size === "large" && <p>{description}</p>}
          </div>
        </div>
        <div className={styles.card__footer}>
          {duration}
          {courseType === CourseType.FREE && price > 0 ? <span>Free</span> : <span>INR {price}</span>}
        </div>
      </div>
    </Link>
  );
};

const CourseLIst: FC<ICourseInfo> = ({ title, description, courseList }) => {
  let cardSize: CourseCardSize = courseList.length === 3 || courseList.length > 4 ? "small" : "large";
  return (
    <section className={styles.courses__container}>
      <div>
        <h2>{title}</h2>
        <p style={{ marginBottom: 30 }}>{description}</p>
        <div
          style={{
            gridTemplateColumns: courseList.length === 4 ? "580px 580px" : "1fr 1fr 1fr",
          }}
          className={`${styles.courses} ${styles.courses__triple}`}
        >
          {courseList.map((course, i) => {
            return (
              <CourseCard
                key={i}
                thumbnail={course.thumbnail}
                title={course.title}
                description={course.description}
                link={course.link}
                cardClass={`${course.cardClass}`}
                duration={course.duration}
                courseType={course.courseType}
                price={2000}
                difficulty={course.difficulty}
                size={cardSize}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CourseLIst;